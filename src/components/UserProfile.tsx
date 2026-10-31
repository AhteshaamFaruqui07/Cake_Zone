import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, CartItem } from '../types';
import { supabase } from '../supabaseClient';
import {
  fetchUserProfile,
  upsertUserProfile,
  uploadFileToAppStorage,
  createSignedUrlForAppFile,
  removeFileFromAppStorage,
  syncProfileUploadedFilesInDb,
  ProfileUploadedFile,
} from '../services/supabaseData';

type UploadedProfileFile = ProfileUploadedFile;

interface UserProfileProps {
  user: {
    name: string;
    role: string;
    initials: string;
    email: string;
  } | null;
  cartItems: CartItem[];
  onNavigate: (screen: ScreenType) => void;
  onUpdateUser: (updated: { name: string; role: string; initials: string; email: string }) => void;
  onOpenCart: () => void;
  onOpenConfigurator: () => void;
  onLogout: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onNavigate,
  onUpdateUser,
  onOpenConfigurator,
  onLogout,
}) => {
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [address, setAddress] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedProfileFile[]>([]);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [memberSince, setMemberSince] = useState('2025');
  const [authProvider, setAuthProvider] = useState('Email');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentAuthUserId, setCurrentAuthUserId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setFullName(user.name);
      setEmail(user.email);
    }

    // Clean up any legacy local storage keys
    try {
      localStorage.removeItem('cakezone_profile_files_default');
    } catch {
      // ignore storage errors
    }

    const loadSupabaseUserDetails = async () => {
      // Reset profile fields for the active user before loading their own records
      setUploadedFiles([]);
      setPhone('');
      setCityCode('');
      setAddress('');
      setDietaryNotes('');

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setCurrentAuthUserId(authUser.id);
        const meta = authUser.user_metadata || {};
        if (meta.full_name || meta.name) {
          setFullName(meta.full_name || meta.name);
        }
        if (meta.profile_email || authUser.email) {
          setEmail(meta.profile_email || authUser.email || '');
        }
        if (meta.phone) {
          const cleanedPhone = String(meta.phone).replace(/^\+91\s*/, '');
          setPhone(cleanedPhone);
        }
        if (meta.city_code || meta.city) {
          setCityCode(meta.city_code || meta.city);
        }
        if (meta.address) {
          setAddress(meta.address);
        }
        if (meta.dietary_notes) {
          setDietaryNotes(meta.dietary_notes);
        }

        let rawFiles: UploadedProfileFile[] = [];
        if (Array.isArray(meta.uploaded_files) && meta.uploaded_files.length > 0) {
          rawFiles = meta.uploaded_files.slice(-1);
        }

        // Load row from Supabase 'profiles' table for this specific user_id
        const { data: dbProfile } = await fetchUserProfile();
        if (dbProfile && (!dbProfile.user_id || dbProfile.user_id === authUser.id)) {
          if (dbProfile.full_name) setFullName(dbProfile.full_name);
          if (dbProfile.email) setEmail(dbProfile.email);
          if (dbProfile.phone) {
            setPhone(String(dbProfile.phone).replace(/^\+91\s*/, ''));
          }
          if (dbProfile.city_code) setCityCode(dbProfile.city_code);
          if (dbProfile.address) setAddress(dbProfile.address);
          if (dbProfile.dietary_notes) setDietaryNotes(dbProfile.dietary_notes);
          if (Array.isArray(dbProfile.uploaded_files)) {
            rawFiles = dbProfile.uploaded_files.slice(-1);
          }
        }

        // Resolve private bucket ("app-files") paths into signed URLs for display
        const hydratedFiles: UploadedProfileFile[] = await Promise.all(
          rawFiles
            .filter((f) => {
              const p = f?.storagePath || f?.path || '';
              return Boolean(p && p.startsWith(`${authUser.id}/`));
            })
            .map(async (f) => {
              const filePath = (f.storagePath || f.path || '').trim();
              const signedUrl = await createSignedUrlForAppFile(filePath, 3600);
              return {
                name: f.name,
                size: f.size,
                type: f.type,
                path: filePath,
                storagePath: filePath,
                dataUrl: signedUrl || undefined,
              };
            })
        );

        setUploadedFiles(hydratedFiles);

        if (authUser.created_at) {
          const date = new Date(authUser.created_at);
          setMemberSince(
            date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })
          );
        }

        const provider = authUser.app_metadata?.provider;
        if (provider) {
          setAuthProvider(provider === 'google' ? 'Google OAuth' : 'Verified Email');
        }
      }
    };

    loadSupabaseUserDetails();
  }, [user?.email]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const isImage =
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file.name);

    if (!isImage) {
      setErrorMessage('Please upload an image file (PNG, JPG, WEBP) for your profile cover.');
      return;
    }

    setErrorMessage(null);
    setSaveMessage(null);

    try {
      // Remove any previous cover file from Supabase Storage ("app-files") before replacing
      for (const existingFile of uploadedFiles) {
        const oldPath = existingFile.storagePath || existingFile.path;
        if (oldPath) {
          await removeFileFromAppStorage(oldPath);
        }
      }

      // Read local dataUrl fallback so cover preview persists across admin views even if storage RLS restricts cross-user signed URLs
      const localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      // Upload new cover file to private bucket "app-files" under:
      // ${auth.uid()}/profile-cover/${itemId}/${uuid}.${extension}
      const { storagePath, signedUrl, error: uploadError } = await uploadFileToAppStorage({
        file,
        featureName: 'profile-cover',
        itemId: currentAuthUserId || undefined,
      });

      if (uploadError && !localDataUrl) {
        setErrorMessage(
          uploadError?.message || 'Failed to upload cover image to Supabase Storage.'
        );
        return;
      }

      const resolvedPath =
        storagePath ||
        `${currentAuthUserId || 'user'}/profile-cover/${Date.now()}-${file.name}`;

      const next: UploadedProfileFile[] = [
        {
          name: file.name,
          size: file.size,
          type: file.type || 'image/jpeg',
          path: resolvedPath,
          storagePath: resolvedPath,
          dataUrl: signedUrl || localDataUrl || undefined,
        },
      ];

      setUploadedFiles(next);

      // Save the returned file path in the profiles table & user metadata
      const formattedPhone = phone.trim() ? `+91 ${phone.trim().replace(/^\+91\s*/, '')}` : '+91';
      await syncProfileUploadedFilesInDb(next, {
        full_name: fullName.trim() || user?.name || 'Member',
        email: email.trim() || user?.email || '',
        phone: formattedPhone,
        city_code: cityCode.trim(),
        address: address.trim(),
        dietary_notes: dietaryNotes.trim(),
      });

      setSaveMessage('Profile cover image uploaded and saved.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload profile cover image.');
    }
  };

  const handleRemoveFile = async (index: number) => {
    const targetFile = uploadedFiles[index];
    const next = uploadedFiles.filter((_, idx) => idx !== index);
    setUploadedFiles(next);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      // 1. Remove file from Supabase Storage ("app-files")
      const targetPath = targetFile?.storagePath || targetFile?.path;
      if (targetPath) {
        await removeFileFromAppStorage(targetPath);
      }

      // 2. Remove file reference from the database ('profiles' table & auth metadata)
      const formattedPhone = phone.trim() ? `+91 ${phone.trim().replace(/^\+91\s*/, '')}` : '+91';
      await syncProfileUploadedFilesInDb(next, {
        full_name: fullName.trim() || user?.name || 'Member',
        email: email.trim() || user?.email || '',
        phone: formattedPhone,
        city_code: cityCode.trim(),
        address: address.trim(),
        dietary_notes: dietaryNotes.trim(),
      });

      setSaveMessage('Profile cover image removed.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to remove cover image.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setErrorMessage(null);

    const trimmedName = fullName.trim() || user?.name || 'Member';
    const trimmedEmail = email.trim() || user?.email || '';
    const formattedPhone = phone.trim() ? `+91 ${phone.trim().replace(/^\+91\s*/, '')}` : '+91';
    const savedTimestamp = new Date().toISOString();

    try {
      // 1. Upsert into Supabase 'profiles' table (saves storagePath in uploaded_files)
      await upsertUserProfile({
        full_name: trimmedName,
        email: trimmedEmail,
        phone: formattedPhone,
        city_code: cityCode.trim(),
        address: address.trim(),
        dietary_notes: dietaryNotes.trim(),
        uploaded_files: uploadedFiles,
        role: user?.role || 'Customer',
      });

      // 2. Also keep Supabase auth user_metadata in sync with the storage path
      const fileSummaries = uploadedFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        path: f.storagePath || f.path || '',
        storagePath: f.storagePath || f.path || '',
      }));

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          profile_email: trimmedEmail,
          phone: formattedPhone,
          city_code: cityCode.trim(),
          city: cityCode.trim(),
          address: address.trim(),
          dietary_notes: dietaryNotes.trim(),
          uploaded_files: fileSummaries,
          profile_saved_at: savedTimestamp,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setSaving(false);
        return;
      }

      if (user) {
        onUpdateUser({
          ...user,
          name: trimmedName,
          email: trimmedEmail,
          initials: (trimmedName.slice(0, 2) || 'CZ').toUpperCase(),
        });
      }

      setSaveMessage('Your profile details have been saved.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const coverImage = [...uploadedFiles].reverse().find((f) => f.dataUrl)?.dataUrl;

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow bg-background">
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Top Profile Hero Banner */}
        <section className="relative bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-lg overflow-hidden">
          {/* Cover Image Banner */}
          {coverImage ? (
            <div className="relative h-40 sm:h-52 w-full overflow-hidden bg-surface-container">
              <img
                src={coverImage}
                alt="Profile Cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">photo_camera</span>
                <span>Change Cover</span>
              </button>
            </div>
          ) : (
            <div className="h-1.5 w-full bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
          )}

          <div className={`p-6 sm:p-8 ${coverImage ? 'pt-4 sm:pt-5' : ''}`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={fullName || 'Profile'}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md border-2 border-surface -mt-10 sm:-mt-12 relative z-10 bg-surface"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-bold text-2xl sm:text-3xl shadow-md border border-primary/20">
                    {(fullName.slice(0, 2) || user?.initials || 'CZ').toUpperCase()}
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight">
                      {fullName || user?.name || 'CakeZone Member'}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      {user?.role || 'VIP Member'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-outline">mail</span>
                    {email || 'No email on file'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-outline">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                      Member since {memberSince}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-primary">shield_lock</span>
                      {authProvider}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                    fullNameInputRef.current?.focus();
                  }}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  Add Your Profile
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('storefront')}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all cursor-pointer border border-outline-variant/60"
                >
                  <span className="material-symbols-outlined text-base">storefront</span>
                  Browse Cakes
                </button>
                <button
                  type="button"
                  onClick={onOpenConfigurator}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all cursor-pointer border border-outline-variant/60"
                >
                  <span className="material-symbols-outlined text-base">cake</span>
                  Custom Cake Studio
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-error/30 text-error hover:bg-error/10 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Add Your Profile Form Section */}
        <div className="w-full">
          <section
            ref={formSectionRef}
            className="bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-sm p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-headline font-bold text-on-surface">
                  Add Your Profile
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Add or update your personal details, contact number, address, files, and dietary notes.
                </p>
              </div>
              <span className="material-symbols-outlined text-2xl text-primary">badge</span>
            </div>

            {saveMessage && (
              <div className="px-4 py-3 bg-[#ebf9f2] border border-[#d2eee0] rounded-xl flex items-center gap-2.5 text-xs font-medium text-[#2c6b4f]">
                <span className="material-symbols-outlined text-base text-[#3b8766]">check_circle</span>
                <span>{saveMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="px-4 py-3 bg-error/10 border border-error/20 rounded-xl text-xs font-medium text-error">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Row 1: Full Name & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                      <span className="material-symbols-outlined text-lg">person</span>
                    </span>
                    <input
                      ref={fullNameInputRef}
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                      <span className="material-symbols-outlined text-lg">mail</span>
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Phone Number (+91) & City Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex items-stretch rounded-xl border border-outline-variant/70 bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    <span className="inline-flex items-center gap-1.5 px-3.5 bg-surface-container text-on-surface font-semibold text-sm border-r border-outline-variant/60 select-none">
                      <span className="material-symbols-outlined text-base text-primary">call</span>
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full px-3.5 py-2.5 bg-transparent text-on-surface text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    City Code
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                      <span className="material-symbols-outlined text-lg">pin_drop</span>
                    </span>
                    <input
                      type="text"
                      value={cityCode}
                      onChange={(e) => setCityCode(e.target.value)}
                      placeholder="E.g., 482001 / Jabalpur"
                      className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Your Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Your Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                  </span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House / Flat No., Street, Landmark, Area"
                    className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Profile Cover Image (Single File Only) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Profile Cover Image (1 File Only)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative overflow-hidden border-2 border-dashed border-outline-variant/70 hover:border-primary/60 bg-surface hover:bg-surface-container-low/50 rounded-2xl p-5 text-center cursor-pointer transition-all"
                >
                  {coverImage && (
                    <img
                      src={coverImage}
                      alt="Profile Cover Preview"
                      className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="relative z-10 flex flex-col items-center justify-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">upload_file</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-on-surface">
                      {coverImage ? 'Click to Replace Profile Cover Image' : 'Click to Upload Cover Image'}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Upload a single cover image for your profile (PNG, JPG, WEBP — 1 file only)
                    </p>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-3">
                    {uploadedFiles.slice(0, 1).map((file, idx) => (
                      <div
                        key={`${file.name}-${idx}`}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.dataUrl ? (
                            <img
                              src={file.dataUrl}
                              alt={file.name}
                              className="w-9 h-9 rounded-lg object-cover border border-outline-variant/40 shrink-0"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-primary text-xl shrink-0">
                              image
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-on-surface truncate">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {formatFileSize(file.size)} • Active Cover Image
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer shrink-0"
                          title="Remove cover image"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 5: Dietary Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Dietary Notes
                </label>
                <textarea
                  rows={3}
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  placeholder="E.g., Eggless preference, nut-free kitchen request, sugar-free, or special celebration instructions..."
                  className="w-full px-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-primary text-on-primary font-headline font-semibold text-xs sm:text-sm rounded-xl shadow-md hover:bg-primary/95 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>{saving ? 'Saving Profile...' : 'Save Profile Details'}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
};
