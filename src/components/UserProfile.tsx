import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, CartItem, Order } from '../types';
import { supabase } from '../supabaseClient';
import {
  fetchUserProfile,
  upsertUserProfile,
  uploadFileToAppStorage,
  createSignedUrlForAppFile,
  removeFileFromAppStorage,
  syncProfileUploadedFilesInDb,
  fetchOrders,
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
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'details' | 'orders'>('details');

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);
  const ordersSectionRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentAuthUserId, setCurrentAuthUserId] = useState<string>('');

  const loadCustomerOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const { data } = await fetchOrders();
      if (data) {
        setCustomerOrders(data);
      }
    } finally {
      setIsLoadingOrders(false);
    }
  };

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
    loadCustomerOrders();

    const channel = supabase
      .channel('customer-profile-orders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadCustomerOrders();
      })
      .subscribe();

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key && e.key.includes('order')) {
        loadCustomerOrders();
      }
    };
    const handleCustomOrdersUpdated = () => {
      loadCustomerOrders();
    };
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('cakezone-orders-updated', handleCustomOrdersUpdated);
    window.addEventListener('focus', handleCustomOrdersUpdated);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('cakezone-orders-updated', handleCustomOrdersUpdated);
      window.removeEventListener('focus', handleCustomOrdersUpdated);
    };
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
      <main className="flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-3 sm:space-y-4">
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

          <div className={`p-5 sm:p-8 ${coverImage ? 'pt-3 sm:pt-5' : ''}`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
              <div className="flex items-center gap-3.5 sm:gap-5 w-full md:w-auto">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={fullName || 'Profile'}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-md border-2 border-surface -mt-4 sm:-mt-5 relative z-10 bg-surface shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center font-headline font-bold text-2xl sm:text-3xl shadow-md border border-primary/20 shrink-0">
                    {(fullName.slice(0, 2) || user?.initials || 'CZ').toUpperCase()}
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight whitespace-nowrap">
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0 text-xs text-outline">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-primary">calendar_month</span>
                      Member since {memberSince}
                    </span>
                    <span className="inline-flex items-center gap-1 -mt-0.5 sm:mt-0">
                      <span className="material-symbols-outlined text-sm text-primary">shield_lock</span>
                      {authProvider}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3.5 w-full md:w-[430px] lg:w-[460px] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProfileTab('details');
                    window.setTimeout(() => {
                      ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                      fullNameInputRef.current?.focus();
                    }, 40);
                  }}
                  className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-3.5 rounded-full sm:rounded-[22px] bg-gradient-to-b from-[#6644B8] to-[#4E2E98] hover:from-[#5D3CA9] hover:to-[#442688] text-white shadow-[0_6px_16px_-4px_rgba(78,46,152,0.45)] transition-all cursor-pointer text-left"
                >
                  <span className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[15px] sm:text-[20px] text-white">
                      person_add
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-[15px] font-semibold tracking-tight leading-none sm:leading-snug whitespace-nowrap">
                    Edit Profile
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('storefront')}
                  className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-3.5 rounded-full sm:rounded-[22px] bg-[#F7F3FF] hover:bg-[#EFE8FF] border border-[#EDE5FC] text-[#1A1528] shadow-2xs transition-all cursor-pointer text-left"
                >
                  <span className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white shadow-2xs flex items-center justify-center shrink-0 text-[#553499]">
                    <span className="material-symbols-outlined text-[15px] sm:text-[20px]">
                      storefront
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-[15px] font-medium tracking-tight leading-none sm:leading-snug whitespace-nowrap">
                    Browse Cakes
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onOpenConfigurator}
                  className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-3.5 rounded-full sm:rounded-[22px] bg-[#F7F3FF] hover:bg-[#EFE8FF] border border-[#EDE5FC] text-[#1A1528] shadow-2xs transition-all cursor-pointer text-left"
                >
                  <span className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white shadow-2xs flex items-center justify-center shrink-0 text-[#553499]">
                    <span className="material-symbols-outlined text-[15px] sm:text-[20px]">
                      cake
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-[15px] font-medium tracking-tight leading-none sm:leading-tight">
                    Custom Cake<span className="hidden sm:inline"><br /></span><span className="sm:hidden"> </span>Studio
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveProfileTab('orders');
                    window.setTimeout(() => {
                      ordersSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 40);
                  }}
                  className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-3.5 rounded-full sm:rounded-[22px] bg-[#F7F3FF] hover:bg-[#EFE8FF] border border-[#EDE5FC] text-[#1A1528] shadow-2xs transition-all cursor-pointer text-left"
                >
                  <span className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-white shadow-2xs flex items-center justify-center shrink-0 text-[#553499]">
                    <span className="material-symbols-outlined text-[15px] sm:text-[20px]">
                      local_shipping
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-[15px] font-medium tracking-tight leading-none sm:leading-snug whitespace-nowrap">
                    Track Orders{' '}
                    <span className="text-[#6B3CE9] font-semibold">
                      ({customerOrders.length})
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="col-span-2 flex items-center justify-center gap-2 py-2 sm:py-3.5 px-4 rounded-full sm:rounded-[18px] bg-white hover:bg-[#FFF5F6] border border-[#FAD4D8] text-[#E11D48] text-xs sm:text-[15px] font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] sm:text-[20px]">
                    logout
                  </span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Toggleable Profile Section: Personal Details | Orders & Tracking */}
        <section ref={ordersSectionRef} className="space-y-3 sm:space-y-4">
          {/* Flat Segmented Pill Toggle Bar */}
          <div className="w-full bg-white rounded-full p-1.5 border border-[#F1ECFA] shadow-[0_2px_10px_rgba(83,52,153,0.06)] grid grid-cols-2 items-center gap-1.5 select-none">
            <button
              type="button"
              onClick={() => setActiveProfileTab('details')}
              className={`flex items-center justify-center gap-2 py-2 px-3 sm:px-5 rounded-full text-xs sm:text-sm transition-colors cursor-pointer ${
                activeProfileTab === 'details'
                  ? 'bg-[#533499] text-white font-semibold'
                  : 'bg-transparent text-[#64748B] hover:text-[#1E1B4B] font-medium'
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Personal Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveProfileTab('orders')}
              className={`flex items-center justify-center gap-2 py-2 px-3 sm:px-5 rounded-full text-xs sm:text-sm transition-colors cursor-pointer ${
                activeProfileTab === 'orders'
                  ? 'bg-[#533499] text-white font-semibold'
                  : 'bg-transparent text-[#64748B] hover:text-[#1E1B4B] font-medium'
              }`}
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 4.5h6" />
                <path d="M12 3v1.5" />
              </svg>
              <span>Track Orders ({customerOrders.length})</span>
            </button>
          </div>

          {activeProfileTab === 'orders' && (
            <div className="space-y-4 sm:space-y-5">
              {/* Header Card matching reference image */}
              <div className="bg-white rounded-[28px] border border-[#EFEAFA] shadow-[0_10px_30px_-10px_rgba(85,52,153,0.1)] p-5 sm:p-7 space-y-4">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#F5F0FF] text-[#553499] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px] sm:text-2xl">
                      local_shipping
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-headline font-bold text-[#14121E] leading-tight">
                      My Order Tracking &amp; History
                    </h2>
                    <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-[#F3EEFF] text-[#553499] text-[11px] sm:text-xs font-bold mt-1.5 tabular-nums">
                      {customerOrders.length}{' '}
                      {customerOrders.length === 1 ? 'Order Found' : 'Orders Found'}
                    </span>
                    <p className="text-xs sm:text-sm text-[#6E6A7C] leading-relaxed mt-2">
                      Track your live patisserie order preparation status from kitchen to doorstep.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadCustomerOrders}
                  disabled={isLoadingOrders}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-[#FAF8FF] hover:bg-[#F2ECFF] border border-[#EFE9FC] text-[#553499] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isLoadingOrders ? 'animate-spin' : ''
                    }`}
                  >
                    sync
                  </span>
                  <span>{isLoadingOrders ? 'Refreshing...' : 'Refresh Status'}</span>
                </button>
              </div>

              {/* Order Cards List */}
              {customerOrders.length === 0 ? (
                <div className="bg-white rounded-[28px] border border-[#EFEAFA] shadow-[0_10px_30px_-10px_rgba(85,52,153,0.1)] p-6 sm:p-10 text-center space-y-3">
                  <span className="material-symbols-outlined text-3xl text-[#553499]/70">
                    receipt_long
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-[#14121E]">
                      No orders placed yet
                    </h3>
                    <p className="text-xs sm:text-sm text-[#6E6A7C] max-w-md mx-auto">
                      Once you place a signature cake or custom cake order, your live order status (Pending, Baking, Delivered) will appear right here.
                    </p>
                  </div>
                  <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => onNavigate('storefront')}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#553499] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">cake</span>
                      <span>Explore Signature Cakes</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenConfigurator}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F7F3FF] border border-[#EDE5FC] text-[#553499] text-xs font-bold hover:bg-[#EFE8FF] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">palette</span>
                      <span>Design Custom Cake</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  {customerOrders.map((ord) => {
                    const stepIndex =
                      ord.status === 'Delivered' ? 3 : ord.status === 'Baking' ? 2 : 1;
                    const steps = [
                      { idx: 1, label: 'Pending', sub: 'Order Received', icon: 'schedule' },
                      {
                        idx: 2,
                        label: 'Baking',
                        sub: 'In Patisserie Oven',
                        icon: 'local_fire_department',
                      },
                      {
                        idx: 3,
                        label: 'Delivered',
                        sub: 'Ready / Handed Over',
                        icon: 'check_circle',
                      },
                    ];

                    return (
                      <div
                        key={ord.id}
                        className="bg-white rounded-[28px] border border-[#EFEAFA] shadow-[0_10px_30px_-10px_rgba(85,52,153,0.1)] p-5 sm:p-6 flex flex-col justify-between gap-4 transition-all hover:shadow-[0_14px_34px_-10px_rgba(85,52,153,0.16)]"
                      >
                        <div className="space-y-3.5">
                          {/* Top Row: Order ID + Date/Time on Left, Status Pill on Right */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm sm:text-base text-[#553499] tabular-nums">
                                  {ord.id}
                                </span>
                                <span className="text-xs sm:text-sm text-[#787486] tabular-nums">
                                  • {ord.date}
                                </span>
                              </div>
                              {ord.timeOfIssue && ord.timeOfIssue !== '—' && (
                                <span className="block text-[11px] sm:text-xs text-[#8E8A9D] tabular-nums mt-0.5">
                                  ({ord.timeOfIssue})
                                </span>
                              )}
                            </div>

                            {/* Status Pill Badge matching reference */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 border ${
                                ord.status === 'Delivered'
                                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
                                  : ord.status === 'Baking'
                                  ? 'bg-[#F5F0FF] border-[#DDD6FE] text-[#553499]'
                                  : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[15px] leading-none">
                                {ord.status === 'Delivered'
                                  ? 'check_circle'
                                  : ord.status === 'Baking'
                                  ? 'local_fire_department'
                                  : 'schedule'}
                              </span>
                              <span>{ord.status || 'Pending'}</span>
                            </span>
                          </div>

                          {/* Cake Name & Type Details */}
                          <div>
                            <h3 className="font-headline font-bold text-base sm:text-lg text-[#14121E] leading-snug">
                              {ord.cakeItem}
                            </h3>
                            {ord.cakeTypeDetail && (
                              <p className="text-xs sm:text-sm text-[#6E6A7C] leading-relaxed mt-1">
                                {ord.cakeTypeDetail}
                              </p>
                            )}
                          </div>

                          {/* 3-Step Centered Progress Cards */}
                          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-1">
                            {steps.map((step) => {
                              const isCompleted = stepIndex >= step.idx;
                              const isCurrent = stepIndex === step.idx;
                              return (
                                <div
                                  key={step.label}
                                  className={`rounded-2xl px-2 py-3 border text-center flex flex-col items-center justify-center transition-all min-w-0 ${
                                    isCurrent
                                      ? 'bg-[#F6F2FF] border-[#C4B5FD]'
                                      : isCompleted
                                      ? 'bg-[#ECFDF5]/70 border-[#A7F3D0]'
                                      : 'bg-[#FAFAFC] border-[#F1F0F5]'
                                  }`}
                                >
                                  <span
                                    className={`material-symbols-outlined text-[18px] sm:text-[20px] mb-1 ${
                                      isCurrent
                                        ? 'text-[#553499]'
                                        : isCompleted
                                        ? 'text-[#047857]'
                                        : 'text-[#94A3B8]'
                                    }`}
                                  >
                                    {isCompleted && !isCurrent ? 'check_circle' : step.icon}
                                  </span>
                                  <span
                                    className={`text-xs sm:text-sm leading-tight ${
                                      isCurrent
                                        ? 'font-bold text-[#14121E]'
                                        : isCompleted
                                        ? 'font-bold text-[#065F46]'
                                        : 'font-medium text-[#64748B]'
                                    }`}
                                  >
                                    {step.label}
                                  </span>
                                  <p
                                    className={`text-[10px] sm:text-[11px] mt-0.5 w-full truncate ${
                                      isCurrent
                                        ? 'text-[#6E6A7C]'
                                        : isCompleted
                                        ? 'text-[#047857]/80'
                                        : 'text-[#94A3B8]'
                                    }`}
                                  >
                                    {step.sub}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer: Order Total */}
                        <div className="pt-3.5 border-t border-[#F1EEF9] flex items-center justify-between">
                          <span className="text-xs sm:text-sm text-[#6E6A7C] font-medium">
                            {ord.amount > 0
                              ? 'Order Total (incl. GST)'
                              : 'Custom Cake Consultation'}
                          </span>
                          <span className="font-black text-lg sm:text-xl text-[#14121E] tabular-nums">
                            {ord.amount > 0
                              ? `₹${Number(ord.amount).toLocaleString('en-IN')}`
                              : 'Bespoke Quote'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Add Your Profile Form Section (Displayed when Personal Details tab is active) */}
        {activeProfileTab === 'details' && (
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
        )}
      </main>
    </div>
  );
};
