import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, CartItem } from '../types';
import { supabase } from '../supabaseClient';
import { fetchUserProfile, upsertUserProfile } from '../services/supabaseData';

interface UploadedProfileFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

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

  useEffect(() => {
    if (user) {
      setFullName(user.name);
      setEmail(user.email);
    }

    const loadSupabaseUserDetails = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
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
        if (Array.isArray(meta.uploaded_files)) {
          setUploadedFiles(meta.uploaded_files);
        }

        // Load row from Supabase 'profiles' table if available
        const { data: dbProfile } = await fetchUserProfile();
        if (dbProfile) {
          if (dbProfile.full_name) setFullName(dbProfile.full_name);
          if (dbProfile.email) setEmail(dbProfile.email);
          if (dbProfile.phone) {
            setPhone(String(dbProfile.phone).replace(/^\+91\s*/, ''));
          }
          if (dbProfile.city_code) setCityCode(dbProfile.city_code);
          if (dbProfile.address) setAddress(dbProfile.address);
          if (dbProfile.dietary_notes) setDietaryNotes(dbProfile.dietary_notes);
          if (Array.isArray(dbProfile.uploaded_files) && dbProfile.uploaded_files.length > 0) {
            setUploadedFiles(dbProfile.uploaded_files);
          }
        }

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
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/') && file.size <= 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              size: file.size,
              type: file.type,
              dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
          },
        ]);
      }
    });

    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setErrorMessage(null);

    const trimmedName = fullName.trim() || user?.name || 'Member';
    const trimmedEmail = email.trim() || user?.email || '';
    const formattedPhone = phone.trim() ? `+91 ${phone.trim().replace(/^\+91\s*/, '')}` : '+91';

    try {
      // 1. Upsert into Supabase 'profiles' table (RLS protected by auth.uid() = user_id)
      await upsertUserProfile({
        full_name: trimmedName,
        email: trimmedEmail,
        phone: formattedPhone,
        city_code: cityCode.trim(),
        address: address.trim(),
        dietary_notes: dietaryNotes.trim(),
        uploaded_files: uploadedFiles,
        role: user?.role || 'VIP Member',
      });

      // 2. Also keep Supabase auth user_metadata in sync
      const fileSummaries = uploadedFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
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

  const avatarPreview = uploadedFiles.find((f) => f.dataUrl)?.dataUrl;

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow bg-background">
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Top Profile Hero Banner */}
        <section className="relative bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-lg overflow-hidden p-6 sm:p-8">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={fullName || 'Profile'}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md border border-primary/20"
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

              {/* Row 4: Add Files */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Add Files
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-outline-variant/70 hover:border-primary/60 bg-surface hover:bg-surface-container-low/50 rounded-2xl p-5 text-center cursor-pointer transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">upload_file</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-on-surface">
                      Click to Add Files
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Upload profile photo, reference cake images, or celebration notes (PNG, JPG, PDF)
                    </p>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {uploadedFiles.map((file, idx) => (
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
                              description
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-on-surface truncate">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="p-1 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer shrink-0"
                          title="Remove file"
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
