import { supabase } from '../supabaseClient';
import {
  CartItem,
  Order,
  OrderStatus,
  LowStockItem,
  CakeProduct,
  LoggedInUserRecord,
  CustomCakeBuilderSettings,
  GalleryItem,
  GallerySectionSettings,
  SavedUserProfileRecord,
} from '../types';
import {
  SIGNATURE_CAKES,
  INITIAL_GALLERY_ITEMS,
  DEFAULT_GALLERY_SECTION_SETTINGS,
} from '../data/initialData';

export const PRIMARY_OWNER_ADMIN_EMAIL = 'ateeqfaruqui@gmail.com';

// Add any additional admin email addresses to this list:
export const ADMIN_EMAILS: string[] = [
  'ateeqfaruqui@gmail.com',
  'ahteshaam.faruqui.cd23@ggits.net',
];

// ============================================================================
// SHARED MULTI-ADMIN SYNCHRONIZATION STORE
// Ensures all admin accounts in ADMIN_EMAILS see identical Orders, Logins,
// Inserted/Deleted Products, Gallery Items, and Custom Cake data even when RLS scopes by user_id
// ============================================================================
const SHARED_STORE_KEYS = {
  orders: 'cakezone_shared_admin_orders_v1',
  deletedOrders: 'cakezone_shared_deleted_orders_v1',
  users: 'cakezone_shared_admin_users_v1',
  savedProfiles: 'cakezone_shared_saved_profiles_v1',
  deletedSavedProfiles: 'cakezone_shared_deleted_saved_profiles_v1',
  profileCoverFallbacks: 'cakezone_shared_profile_covers_v1',
  products: 'cakezone_shared_admin_products_v1',
  deletedProducts: 'cakezone_shared_deleted_products_v1',
  productImageFallbacks: 'cakezone_shared_product_images_v1',
  galleryItems: 'cakezone_shared_gallery_items_v1',
  deletedGalleryItems: 'cakezone_shared_deleted_gallery_items_v1',
  galleryImageFallbacks: 'cakezone_shared_gallery_images_v1',
  gallerySettings: 'cakezone_shared_gallery_settings_v1',
  customCakeSettings: 'cakezone_shared_custom_cake_settings_v1',
  customCakes: 'cakezone_shared_custom_cakes_v1',
  deletedCustomCakes: 'cakezone_shared_deleted_custom_cakes_v1',
  inventory: 'cakezone_shared_inventory_v1',
  revokedAdmins: 'cakezone_shared_revoked_admins_v1',
  promotedAdmins: 'cakezone_shared_promoted_admins_v1',
};

const readSharedStore = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeSharedStore = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
};

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (normalized === PRIMARY_OWNER_ADMIN_EMAIL) return true;

  const revoked = readSharedStore<string[]>(SHARED_STORE_KEYS.revokedAdmins, []);
  if (revoked.includes(normalized)) {
    return false;
  }

  const promoted = readSharedStore<string[]>(SHARED_STORE_KEYS.promotedAdmins, []);
  if (promoted.includes(normalized)) {
    return true;
  }

  return ADMIN_EMAILS.some((adminEmail) => adminEmail.trim().toLowerCase() === normalized);
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

export const isUserAdminSync = (
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  } | null,
  dbRole?: string | null
): boolean => {
  if (!user) return false;
  const email = (user.email || '').trim().toLowerCase();
  if (email === PRIMARY_OWNER_ADMIN_EMAIL) return true;

  const revoked = readSharedStore<string[]>(SHARED_STORE_KEYS.revokedAdmins, []);
  if (email && revoked.includes(email)) {
    return false;
  }

  const profileRole = String(dbRole || '').trim().toLowerCase();
  if (profileRole === 'customer') {
    return false;
  }

  const metaRole = String(user.user_metadata?.role || '').trim().toLowerCase();
  const appRole = String(user.app_metadata?.role || '').trim().toLowerCase();

  if (
    profileRole === 'admin' ||
    metaRole === 'admin' ||
    appRole === 'admin' ||
    user.user_metadata?.is_admin === true ||
    user.app_metadata?.is_admin === true ||
    isAdminEmail(email)
  ) {
    return true;
  }

  return false;
};

export const resolveIsAdminFromSupabase = async (
  sessionUser?: {
    id?: string;
    email?: string | null;
    role?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  } | null
): Promise<boolean> => {
  let targetUser = sessionUser;
  if (!targetUser) {
    const { data: { session } } = await supabase.auth.getSession();
    targetUser = session?.user ?? null;
  }
  if (!targetUser) return false;

  if (isUserAdminSync(targetUser)) {
    return true;
  }

  try {
    if (targetUser.id) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (data && isUserAdminSync(targetUser, data.role)) {
        return true;
      }
    }
    if (targetUser.email) {
      const { data: emailProfile } = await supabase
        .from('profiles')
        .select('role')
        .ilike('email', targetUser.email.trim())
        .maybeSingle();

      if (emailProfile && isUserAdminSync(targetUser, emailProfile.role)) {
        return true;
      }
    }
  } catch {
    // Ignore query errors if column doesn't exist
  }

  return false;
};

export const APP_FILES_BUCKET = 'app-files';

export interface ProfileUploadedFile {
  name: string;
  size: number;
  type: string;
  path?: string;
  storagePath?: string;
  dataUrl?: string;
}

export interface ProfileRecord {
  id?: string;
  user_id?: string;
  full_name: string;
  email: string;
  phone: string;
  city_code: string;
  address: string;
  dietary_notes: string;
  uploaded_files: ProfileUploadedFile[];
  role?: string;
}

export interface CustomCakeRecord {
  id?: string;
  user_id?: string;
  tiers: number;
  sponge_flavor: string;
  filling: string;
  exterior_finish: string;
  accents: string[];
  inscription: string;
  event_date: string;
  estimated_price: number;
}

// Helper to get the currently authenticated user ID
export const getAuthenticatedUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};

// Generate a UUID v4 for storage object naming
const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Extract normalized file extension
const getFileExtension = (fileName: string, mimeType?: string): string => {
  const parts = fileName.split('.');
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
  }
  if (mimeType) {
    const sub = mimeType.split('/')[1]?.toLowerCase();
    if (sub === 'jpeg') return 'jpg';
    if (sub) return sub.replace(/[^a-z0-9]/g, '');
  }
  return 'bin';
};

// ============================================================================
// SUPABASE STORAGE ("app-files" Private Bucket)
// Path structure: ${auth.uid()}/${featureName}/${itemId}/${uuid}.${extension}
// ============================================================================

export const isStorageFilePath = (path?: string | null): boolean => {
  if (!path || typeof path !== 'string') return false;
  const trimmed = path.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return false;
  }
  return true;
};

export const uploadFileToAppStorage = async (params: {
  file: File;
  featureName: string;
  itemId?: string;
}): Promise<{
  storagePath: string | null;
  filePath: string | null;
  signedUrl: string | null;
  error: any;
}> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { storagePath: null, filePath: null, signedUrl: null, error: new Error('Not authenticated') };
  }

  const cleanFeature = params.featureName.replace(/[^a-zA-Z0-9_-]/g, '-') || 'files';
  const cleanItemId = (params.itemId || userId).replace(/[^a-zA-Z0-9_-]/g, '-');
  const uuid = generateUuid();
  const extension = getFileExtension(params.file.name, params.file.type);

  // Strict folder rule: ${auth.uid()}/${featureName}/${itemId}/${uuid}.${extension}
  const storagePath = `${userId}/${cleanFeature}/${cleanItemId}/${uuid}.${extension}`;

  const { data, error } = await supabase.storage
    .from(APP_FILES_BUCKET)
    .upload(storagePath, params.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type || 'application/octet-stream',
    });

  if (error || !data?.path) {
    return { storagePath: null, filePath: null, signedUrl: null, error: error || new Error('Upload failed') };
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(APP_FILES_BUCKET)
    .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year signed URL

  return {
    storagePath: data.path,
    filePath: data.path,
    signedUrl: signedData?.signedUrl ?? null,
    error: signedError ?? null,
  };
};

export const createSignedUrlForAppFile = async (
  storagePath: string,
  expiresInSeconds = 60 * 60 * 24 * 365
): Promise<string | null> => {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(APP_FILES_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
};

export const removeFileFromAppStorage = async (
  storagePath: string
): Promise<{ error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };
  if (!storagePath) return { error: null };

  const { error } = await supabase.storage
    .from(APP_FILES_BUCKET)
    .remove([storagePath]);

  return { error };
};

export const deleteFileFromAppStorage = removeFileFromAppStorage;

// ============================================================================
// 1. PROFILES CRUD (Load, Create / Update, Delete)
// ============================================================================

export const fetchUserProfile = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data: data as ProfileRecord | null, error };
};

export const upsertUserProfile = async (profile: ProfileRecord) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);
  const savedAtIso = new Date().toISOString();

  // Store only file metadata + storage path in the database (never transient signed URLs)
  const dbFiles = (profile.uploaded_files || []).map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type,
    path: f.storagePath || f.path || '',
    storagePath: f.storagePath || f.path || '',
  }));

  let { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        city_code: profile.city_code,
        address: profile.address,
        dietary_notes: profile.dietary_notes,
        uploaded_files: dbFiles,
        role: isAdmin ? 'Admin' : 'Customer',
        updated_at: savedAtIso,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    const fallbackUpsert = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          city_code: profile.city_code,
          address: profile.address,
          dietary_notes: profile.dietary_notes,
          uploaded_files: dbFiles,
          role: isAdmin ? 'Admin' : 'Customer',
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();
    data = fallbackUpsert.data;
    error = fallbackUpsert.error;
  }

  const cleanEmail = (profile.email || session?.user?.email || '').trim();
  const latestFile = [...(profile.uploaded_files || [])].reverse()[0];
  const coverStoragePath = latestFile?.storagePath || latestFile?.path || '';
  const coverImagePreview = latestFile?.dataUrl || '';

  if (coverImagePreview) {
    const coverFallbacks = readSharedStore<Record<string, string>>(
      SHARED_STORE_KEYS.profileCoverFallbacks,
      {}
    );
    coverFallbacks[userId] = coverImagePreview;
    if (cleanEmail) {
      coverFallbacks[cleanEmail.toLowerCase()] = coverImagePreview;
    }
    if (coverStoragePath) {
      coverFallbacks[coverStoragePath] = coverImagePreview;
    }
    writeSharedStore(SHARED_STORE_KEYS.profileCoverFallbacks, coverFallbacks);
  }

  // Sync saved profile record into shared admin savedProfiles store
  const savedProfiles = readSharedStore<SavedUserProfileRecord[]>(
    SHARED_STORE_KEYS.savedProfiles,
    []
  );
  const existingSaved = savedProfiles.find(
    (sp) =>
      sp.userId === userId ||
      sp.id === userId ||
      (cleanEmail && sp.email.trim().toLowerCase() === cleanEmail.toLowerCase())
  );

  const savedProfileEntry: SavedUserProfileRecord = {
    id: userId,
    userId,
    fullName: profile.full_name || cleanEmail.split('@')[0] || 'CakeZone Member',
    email: cleanEmail || '—',
    phone: profile.phone || '—',
    cityCode: profile.city_code || '',
    address: profile.address || '—',
    coverImage:
      (profile.uploaded_files && profile.uploaded_files.length === 0
        ? ''
        : coverImagePreview || existingSaved?.coverImage || ''),
    coverImageName:
      profile.uploaded_files && profile.uploaded_files.length === 0
        ? ''
        : latestFile?.name || existingSaved?.coverImageName || '',
    coverStoragePath:
      profile.uploaded_files && profile.uploaded_files.length === 0
        ? ''
        : coverStoragePath || existingSaved?.coverStoragePath || '',
    dietaryNotes: profile.dietary_notes || '—',
    savedAt: savedAtIso,
    role: isAdmin ? 'Admin' : 'Customer',
  };

  writeSharedStore(SHARED_STORE_KEYS.savedProfiles, [
    savedProfileEntry,
    ...savedProfiles.filter(
      (sp) =>
        sp.id !== userId &&
        sp.userId !== userId &&
        (!cleanEmail || sp.email.trim().toLowerCase() !== cleanEmail.toLowerCase())
    ),
  ]);

  // Remove from deletedSavedProfiles if re-saved
  const deletedSaved = readSharedStore<string[]>(SHARED_STORE_KEYS.deletedSavedProfiles, []);
  if (deletedSaved.length > 0) {
    writeSharedStore(
      SHARED_STORE_KEYS.deletedSavedProfiles,
      deletedSaved.filter((id) => id !== userId && id !== cleanEmail.toLowerCase())
    );
  }

  // Also sync updated profile details into the shared admin users cache
  const sharedUsers = readSharedStore<LoggedInUserRecord[]>(SHARED_STORE_KEYS.users, []);
  const updatedUserRecord: LoggedInUserRecord = {
    id: userId,
    name: profile.full_name || cleanEmail.split('@')[0] || 'CakeZone User',
    email: cleanEmail || '—',
    phone: profile.phone || '—',
    role: isAdmin ? 'Admin' : 'Customer',
    city: profile.city_code || profile.address || '—',
    lastLoginAt: savedAtIso,
  };
  writeSharedStore(SHARED_STORE_KEYS.users, [
    updatedUserRecord,
    ...sharedUsers.filter(
      (u) =>
        u.id !== userId &&
        (!cleanEmail || u.email.trim().toLowerCase() !== cleanEmail.toLowerCase())
    ),
  ]);

  return { data: data as ProfileRecord | null, error };
};

export const syncProfileUploadedFilesInDb = async (
  files: ProfileUploadedFile[],
  fallbackProfile?: {
    full_name?: string;
    email?: string;
    phone?: string;
    city_code?: string;
    address?: string;
    dietary_notes?: string;
  }
) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return { error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);
  const savedAtIso = new Date().toISOString();

  const dbFiles = files.map((f) => ({
    name: f.name,
    size: f.size,
    type: f.type,
    path: f.storagePath || f.path || '',
    storagePath: f.storagePath || f.path || '',
  }));

  const resolvedName =
    fallbackProfile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Member';
  const resolvedEmail = (fallbackProfile?.email || session?.user?.email || '').trim();
  const resolvedPhone = fallbackProfile?.phone || session?.user?.user_metadata?.phone || '';
  const resolvedCityCode =
    fallbackProfile?.city_code || session?.user?.user_metadata?.city_code || '';
  const resolvedAddress = fallbackProfile?.address || session?.user?.user_metadata?.address || '';
  const resolvedDietary =
    fallbackProfile?.dietary_notes || session?.user?.user_metadata?.dietary_notes || '';

  // Check if profile row already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  let dbError: any = null;
  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update({ uploaded_files: dbFiles })
      .eq('user_id', userId);
    dbError = error;
  } else {
    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: userId,
        full_name: resolvedName,
        email: resolvedEmail,
        phone: resolvedPhone,
        city_code: resolvedCityCode,
        address: resolvedAddress,
        dietary_notes: resolvedDietary,
        uploaded_files: dbFiles,
        role: isAdmin ? 'Admin' : 'Customer',
      },
      { onConflict: 'user_id' }
    );
    dbError = error;
  }

  const latestFile = [...files].reverse()[0];
  const coverStoragePath = latestFile?.storagePath || latestFile?.path || '';
  const coverImagePreview = latestFile?.dataUrl || '';

  const coverFallbacks = readSharedStore<Record<string, string>>(
    SHARED_STORE_KEYS.profileCoverFallbacks,
    {}
  );
  if (files.length === 0) {
    delete coverFallbacks[userId];
    if (resolvedEmail) delete coverFallbacks[resolvedEmail.toLowerCase()];
  } else if (coverImagePreview) {
    coverFallbacks[userId] = coverImagePreview;
    if (resolvedEmail) coverFallbacks[resolvedEmail.toLowerCase()] = coverImagePreview;
    if (coverStoragePath) coverFallbacks[coverStoragePath] = coverImagePreview;
  }
  writeSharedStore(SHARED_STORE_KEYS.profileCoverFallbacks, coverFallbacks);

  // Also sync into shared savedProfiles store
  const savedProfiles = readSharedStore<SavedUserProfileRecord[]>(
    SHARED_STORE_KEYS.savedProfiles,
    []
  );
  const existingSaved = savedProfiles.find(
    (sp) =>
      sp.userId === userId ||
      sp.id === userId ||
      (resolvedEmail && sp.email.trim().toLowerCase() === resolvedEmail.toLowerCase())
  );

  const updatedSavedProfile: SavedUserProfileRecord = {
    id: userId,
    userId,
    fullName: resolvedName || existingSaved?.fullName || 'CakeZone Member',
    email: resolvedEmail || existingSaved?.email || '—',
    phone: resolvedPhone || existingSaved?.phone || '—',
    cityCode: resolvedCityCode || existingSaved?.cityCode || '',
    address: resolvedAddress || existingSaved?.address || '—',
    coverImage: files.length === 0 ? '' : coverImagePreview || existingSaved?.coverImage || '',
    coverImageName: files.length === 0 ? '' : latestFile?.name || existingSaved?.coverImageName || '',
    coverStoragePath: files.length === 0 ? '' : coverStoragePath || existingSaved?.coverStoragePath || '',
    dietaryNotes: resolvedDietary || existingSaved?.dietaryNotes || '—',
    savedAt: savedAtIso,
    role: isAdmin ? 'Admin' : 'Customer',
  };

  writeSharedStore(SHARED_STORE_KEYS.savedProfiles, [
    updatedSavedProfile,
    ...savedProfiles.filter(
      (sp) =>
        sp.id !== userId &&
        sp.userId !== userId &&
        (!resolvedEmail || sp.email.trim().toLowerCase() !== resolvedEmail.toLowerCase())
    ),
  ]);

  // Also keep auth user_metadata in sync
  await supabase.auth.updateUser({
    data: {
      uploaded_files: dbFiles,
      profile_saved_at: savedAtIso,
    },
  });

  return { error: dbError };
};

export const fetchSavedUserProfilesFromSupabase = async (): Promise<{
  data: SavedUserProfileRecord[];
  error: any;
}> => {
  const deletedIds = new Set(
    readSharedStore<string[]>(SHARED_STORE_KEYS.deletedSavedProfiles, [])
  );
  const coverFallbacks = readSharedStore<Record<string, string>>(
    SHARED_STORE_KEYS.profileCoverFallbacks,
    {}
  );
  const sharedSavedProfiles = readSharedStore<SavedUserProfileRecord[]>(
    SHARED_STORE_KEYS.savedProfiles,
    []
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: profilesRows, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const resolveCoverUrl = async (
    storagePath?: string,
    userId?: string,
    email?: string,
    existingUrl?: string
  ): Promise<string> => {
    if (storagePath && isStorageFilePath(storagePath)) {
      const signed = await createSignedUrlForAppFile(storagePath);
      if (signed) return signed;
      if (coverFallbacks[storagePath]) return coverFallbacks[storagePath];
    }
    if (existingUrl && !isStorageFilePath(existingUrl)) {
      return existingUrl;
    }
    if (userId && coverFallbacks[userId]) {
      return coverFallbacks[userId];
    }
    if (email && coverFallbacks[email.trim().toLowerCase()]) {
      return coverFallbacks[email.trim().toLowerCase()];
    }
    return '';
  };

  const byKey = new Map<string, SavedUserProfileRecord>();

  // 1. Load shared saved profiles first
  for (const sp of sharedSavedProfiles) {
    const emailKey = sp.email && sp.email !== '—' ? sp.email.trim().toLowerCase() : '';
    const key = emailKey || sp.userId || sp.id;
    if (!key || deletedIds.has(sp.id) || (emailKey && deletedIds.has(emailKey))) continue;

    const resolvedCover = await resolveCoverUrl(
      sp.coverStoragePath,
      sp.userId || sp.id,
      sp.email,
      sp.coverImage
    );

    byKey.set(key, {
      ...sp,
      coverImage: resolvedCover,
    });
  }

  // 2. Overlay live rows from Supabase `profiles` table
  if (!error && Array.isArray(profilesRows)) {
    for (const row of profilesRows) {
      const uid = String(row.user_id || row.id || '');
      const email = String(row.email || '').trim();
      const emailKey = email ? email.toLowerCase() : '';
      const key = emailKey || uid;
      if (!key || deletedIds.has(uid) || (emailKey && deletedIds.has(emailKey))) continue;

      const existing = byKey.get(key);
      const uploadedFiles: ProfileUploadedFile[] = Array.isArray(row.uploaded_files)
        ? row.uploaded_files
        : [];
      const latestFile = [...uploadedFiles].reverse()[0];
      const storagePath =
        latestFile?.storagePath ||
        latestFile?.path ||
        existing?.coverStoragePath ||
        '';
      const fileName = latestFile?.name || existing?.coverImageName || '';

      const resolvedCover = await resolveCoverUrl(
        storagePath,
        uid,
        email,
        latestFile?.dataUrl || existing?.coverImage
      );

      const fullAddress =
        row.address && row.city_code
          ? `${row.address} (${row.city_code})`
          : row.address || existing?.address || row.city_code || '—';

      const savedTimestamp =
        row.updated_at ||
        existing?.savedAt ||
        row.created_at ||
        new Date().toISOString();

      const isAdminRole =
        String(row.role || '').trim().toLowerCase() === 'admin' || isAdminEmail(email);

      byKey.set(key, {
        id: uid || existing?.id || `profile-${emailKey}`,
        userId: uid || existing?.userId,
        fullName:
          row.full_name ||
          existing?.fullName ||
          (email ? email.split('@')[0] : 'CakeZone Member'),
        email: email || existing?.email || '—',
        phone:
          row.phone && row.phone !== '+91'
            ? row.phone
            : existing?.phone && existing.phone !== '+91'
            ? existing.phone
            : '—',
        cityCode: row.city_code || existing?.cityCode || '',
        address: fullAddress,
        coverImage: resolvedCover,
        coverImageName: fileName,
        coverStoragePath: storagePath,
        dietaryNotes:
          row.dietary_notes ||
          existing?.dietaryNotes ||
          '—',
        savedAt: savedTimestamp,
        role: isAdminRole ? 'Admin' : 'Customer',
      });
    }
  }

  // 3. Also check active session user's user_metadata if they saved profile details
  if (session?.user) {
    const authUser = session.user;
    const meta = authUser.user_metadata || {};
    const email = (meta.profile_email || authUser.email || '').trim();
    const emailKey = email.toLowerCase();
    const key = emailKey || authUser.id;

    if (
      key &&
      !deletedIds.has(authUser.id) &&
      (!emailKey || !deletedIds.has(emailKey)) &&
      (meta.full_name || meta.phone || meta.address || meta.dietary_notes || meta.uploaded_files)
    ) {
      const existing = byKey.get(key);
      const metaFiles: ProfileUploadedFile[] = Array.isArray(meta.uploaded_files)
        ? meta.uploaded_files
        : [];
      const latestMetaFile = [...metaFiles].reverse()[0];
      const storagePath =
        latestMetaFile?.storagePath ||
        latestMetaFile?.path ||
        existing?.coverStoragePath ||
        '';
      const resolvedCover = await resolveCoverUrl(
        storagePath,
        authUser.id,
        email,
        existing?.coverImage
      );

      const addressVal =
        meta.address && meta.city_code
          ? `${meta.address} (${meta.city_code})`
          : meta.address || existing?.address || meta.city_code || '—';

      byKey.set(key, {
        id: authUser.id,
        userId: authUser.id,
        fullName:
          existing?.fullName && existing.fullName !== 'Member'
            ? existing.fullName
            : meta.full_name || meta.name || email.split('@')[0] || 'CakeZone Member',
        email: email || existing?.email || '—',
        phone:
          existing?.phone && existing.phone !== '—' && existing.phone !== '+91'
            ? existing.phone
            : meta.phone && meta.phone !== '+91'
            ? meta.phone
            : '—',
        cityCode: meta.city_code || existing?.cityCode || '',
        address:
          existing?.address && existing.address !== '—' ? existing.address : addressVal,
        coverImage: resolvedCover || existing?.coverImage || '',
        coverImageName: latestMetaFile?.name || existing?.coverImageName || '',
        coverStoragePath: storagePath,
        dietaryNotes:
          existing?.dietaryNotes && existing.dietaryNotes !== '—'
            ? existing.dietaryNotes
            : meta.dietary_notes || '—',
        savedAt:
          meta.profile_saved_at ||
          existing?.savedAt ||
          authUser.updated_at ||
          authUser.created_at ||
          new Date().toISOString(),
        role: isAdminEmail(email) || existing?.role === 'Admin' ? 'Admin' : 'Customer',
      });
    }
  }

  const unified = Array.from(byKey.values()).sort((a, b) => {
    const tA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
    const tB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
    return tB - tA;
  });

  writeSharedStore(SHARED_STORE_KEYS.savedProfiles, unified);
  return { data: unified, error: null };
};

export const deleteSavedUserProfileFromAdmin = async (
  profileId: string,
  email?: string
): Promise<{ error: any }> => {
  const deleted = readSharedStore<string[]>(SHARED_STORE_KEYS.deletedSavedProfiles, []);
  const nextDeleted = new Set(deleted);
  if (profileId) nextDeleted.add(profileId);
  if (email && email !== '—') nextDeleted.add(email.trim().toLowerCase());
  writeSharedStore(SHARED_STORE_KEYS.deletedSavedProfiles, Array.from(nextDeleted));

  const savedProfiles = readSharedStore<SavedUserProfileRecord[]>(
    SHARED_STORE_KEYS.savedProfiles,
    []
  );
  writeSharedStore(
    SHARED_STORE_KEYS.savedProfiles,
    savedProfiles.filter(
      (p) =>
        p.id !== profileId &&
        (!email || p.email.trim().toLowerCase() !== email.trim().toLowerCase())
    )
  );

  if (profileId && !profileId.startsWith('profile-')) {
    await supabase.from('profiles').delete().eq('user_id', profileId);
  }
  return { error: null };
};

export const deleteUserProfile = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', userId);

  return { error };
};

// ============================================================================
// 2. CART ITEMS CRUD (Load, Create, Update, Delete)
// ============================================================================

export const fetchCartItems = async (): Promise<{ data: CartItem[]; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from('cart_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return { data: [], error };
  }

  const mapped: CartItem[] = data.map((row: any) => ({
    id: row.id,
    cakeId: row.cake_id || undefined,
    name: row.name,
    price: Number(row.price),
    quantity: Number(row.quantity),
    image: row.image,
    details: row.details || undefined,
  }));

  return { data: mapped, error: null };
};

export const addCartItemToDb = async (item: Omit<CartItem, 'id'>): Promise<{ data: CartItem | null; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  // Check if item with same cake_id already exists for this user
  if (item.cakeId) {
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('cake_id', item.cakeId)
      .maybeSingle();

    if (existing) {
      const newQuantity = Number(existing.quantity) + item.quantity;
      const { data: updated, error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError || !updated) return { data: null, error: updateError };

      return {
        data: {
          id: updated.id,
          cakeId: updated.cake_id || undefined,
          name: updated.name,
          price: Number(updated.price),
          quantity: Number(updated.quantity),
          image: updated.image,
          details: updated.details || undefined,
        },
        error: null,
      };
    }
  }

  const { data, error } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      cake_id: item.cakeId || null,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      details: item.details || '',
    })
    .select()
    .single();

  if (error || !data) return { data: null, error };

  return {
    data: {
      id: data.id,
      cakeId: data.cake_id || undefined,
      name: data.name,
      price: Number(data.price),
      quantity: Number(data.quantity),
      image: data.image,
      details: data.details || undefined,
    },
    error: null,
  };
};

export const updateCartItemQuantityInDb = async (id: string, quantity: number) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  if (quantity <= 0) {
    return deleteCartItemFromDb(id);
  }

  const { data, error } = await supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
};

export const deleteCartItemFromDb = async (id: string) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  return { error };
};

export const clearUserCartInDb = async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: new Error('Not authenticated') };

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  return { error };
};

// ============================================================================
// 3. ORDERS CRUD & ORDER HISTORY (Load, Create, Update, Delete via Supabase)
// ============================================================================

const parseCustomerContactFromOrder = (
  rawCustomer: string,
  rawInstructions?: string
): { name: string; email: string; phone: string } => {
  let name = (rawCustomer || 'Customer').trim();
  let email = '';
  let phone = '';

  const instructions = String(rawInstructions || '');
  const emailMatch = instructions.match(/Email:\s*([^\s|]+)/i);
  if (emailMatch?.[1]) {
    email = emailMatch[1].trim();
  }
  const phoneMatch = instructions.match(/(?:Contact|Phone):\s*([^|]+)/i);
  if (phoneMatch?.[1]) {
    phone = phoneMatch[1].trim();
  }

  const parenMatch = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    name = parenMatch[1].trim() || name;
    if (!phone) {
      phone = parenMatch[2].trim();
    }
  }

  return { name, email, phone };
};

const ensureFullCakeTitle = (rawName: string, category?: string): string => {
  const trimmed = (rawName || '').trim();
  if (!trimmed) return 'Artisanal Celebration Cake';
  if (/cake/i.test(trimmed)) {
    return trimmed;
  }
  if (category && !trimmed.toLowerCase().includes(category.toLowerCase())) {
    return `${trimmed} (${category} Cake)`;
  }
  return `${trimmed} Cake`;
};

const buildOrderCakeFullDetails = (
  row: any,
  catalogList: CakeProduct[],
  customCakesByUser: Record<string, any[]>
): { fullCakeName: string; cakeTypeDetail: string } => {
  const findCatalogCake = (nameOrId: string): CakeProduct | undefined => {
    const clean = (nameOrId || '')
      .toLowerCase()
      .replace(/^\d+\s*x\s*/i, '')
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace(/\s+cake$/i, '')
      .trim();
    if (!clean) return undefined;
    return catalogList.find((c) => {
      const cName = c.name.toLowerCase().replace(/\s+cake$/i, '').trim();
      const cId = c.id.toLowerCase().trim();
      return (
        cId === clean ||
        cName === clean ||
        clean.includes(cName) ||
        cName.includes(clean)
      );
    });
  };

  const fullNames: string[] = [];
  const typeDetails: string[] = [];

  if (Array.isArray(row.items) && row.items.length > 0) {
    row.items.forEach((item: any) => {
      const qty = Number(item?.quantity || 1);
      const rawItemName = String(item?.name || 'Artisanal Cake').trim();
      const matched = findCatalogCake(item?.cakeId || rawItemName);

      if (matched) {
        const fullTitle = ensureFullCakeTitle(matched.name, matched.category);
        fullNames.push(`${qty}x ${fullTitle}`);
        const badge = matched.caption || matched.tags?.[1] || 'Signature';
        const typeStr = `Type: ${matched.category || 'Artisanal'} Cake (${badge}) · ${
          item?.details || matched.servings || '8 - 10 Servings'
        } · ₹${Number(item?.price || matched.price).toLocaleString('en-IN')}`;
        typeDetails.push(typeStr);
      } else {
        const fullTitle = ensureFullCakeTitle(rawItemName);
        fullNames.push(`${qty}x ${fullTitle}`);
        if (item?.details) {
          typeDetails.push(`Type: Custom / Bespoke Cake · ${item.details}`);
        } else if (/bespoke|custom/i.test(rawItemName) && row.user_id && customCakesByUser[row.user_id]?.[0]) {
          const cc = customCakesByUser[row.user_id][0];
          typeDetails.push(
            `Type: Custom ${cc.tiers}-Tier Cake · Sponge: ${cc.sponge_flavor} · Filling: ${cc.filling} · Finish: ${cc.exterior_finish}`
          );
        } else {
          typeDetails.push(`Type: Artisanal Patisserie Cake · ₹${Number(item?.price || row.amount || 0).toLocaleString('en-IN')}`);
        }
      }
    });
  } else {
    const rawCakeItem = String(row.cake_item || 'Artisanal Cake Order').trim();
    const segments = rawCakeItem
      .split(/\s*\|\s*|\s*,\s*(?=\d+x\s)/i)
      .map((s) => s.trim())
      .filter(Boolean);

    const partsToParse = segments.length > 0 ? segments : [rawCakeItem];

    partsToParse.forEach((part) => {
      const qtyMatch = part.match(/^(\d+)\s*x\s+(.*)$/i);
      const qtyPrefix = qtyMatch ? `${qtyMatch[1]}x ` : '1x ';
      const coreText = qtyMatch ? qtyMatch[2].trim() : part.trim();

      // Check if inline details in parentheses already exist
      const inlineParen = coreText.match(/^(.*?)\s*\((.+)\)\s*$/);
      const baseTitle = inlineParen ? inlineParen[1].trim() : coreText;
      const inlineDetail = inlineParen ? inlineParen[2].trim() : '';

      const matched = findCatalogCake(baseTitle);
      if (matched) {
        const fullTitle = ensureFullCakeTitle(matched.name, matched.category);
        fullNames.push(`${qtyPrefix}${fullTitle}`);
        const badge = matched.caption || matched.tags?.[1] || 'Signature';
        typeDetails.push(
          `Type: ${matched.category || 'Artisanal'} Cake (${badge}) · ${
            inlineDetail || matched.servings || '8 - 10 Servings'
          } · ${matched.description}`
        );
      } else {
        const fullTitle = ensureFullCakeTitle(baseTitle);
        fullNames.push(`${qtyPrefix}${fullTitle}`);
        if (inlineDetail) {
          typeDetails.push(`Type: ${inlineDetail}`);
        } else if (/bespoke|custom/i.test(baseTitle) && row.user_id && customCakesByUser[row.user_id]?.[0]) {
          const cc = customCakesByUser[row.user_id][0];
          typeDetails.push(
            `Type: Custom ${cc.tiers}-Tier Cake · Sponge: ${cc.sponge_flavor} · Filling: ${cc.filling} · Finish: ${cc.exterior_finish}`
          );
        } else {
          typeDetails.push('Type: Signature Celebration Cake · Freshly Baked to Order');
        }
      }
    });
  }

  return {
    fullCakeName: fullNames.join(' + ') || 'Artisanal Celebration Cake',
    cakeTypeDetail: typeDetails.join(' | '),
  };
};

export const fetchOrders = async (): Promise<{ data: Order[]; error: any }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: [], error: null };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return { data: [], error };
  }

  // Enrich with Supabase profiles, products, and custom_cakes tables
  const profilesByUserId: Record<string, { full_name?: string; email?: string; phone?: string }> = {};
  const [profilesRes, productsRes, customCakesRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('products').select('*'),
    supabase.from('custom_cakes').select('*').order('created_at', { ascending: false }),
  ]);

  const profilesData = profilesRes.data;
  if (Array.isArray(profilesData)) {
    profilesData.forEach((p: any) => {
      const uid = p?.user_id || p?.id;
      if (uid) {
        profilesByUserId[uid] = p;
      }
      if (p?.id) {
        profilesByUserId[p.id] = p;
      }
    });
  }

  const catalogList: CakeProduct[] = [...SIGNATURE_CAKES];
  if (Array.isArray(productsRes.data)) {
    productsRes.data.forEach((row: any) => {
      if (row?.name && !catalogList.some((c) => c.id === String(row.id) || c.name.toLowerCase() === String(row.name).toLowerCase())) {
        catalogList.push({
          id: String(row.id),
          name: row.name,
          caption: row.caption || 'Signature',
          price: Number(row.price || 899),
          rating: Number(row.rating ?? 4.8),
          reviewsCount: Number(row.reviews_count ?? 50),
          category: row.category || 'Chocolate',
          description: row.description || '',
          image: row.image || '',
          ingredients: row.ingredients || '',
          servings: row.servings || '8 - 10 Servings',
          tags: Array.isArray(row.tags) ? row.tags : [row.category || 'Signature'],
        });
      }
    });
  }

  const customCakesByUser: Record<string, any[]> = {};
  if (Array.isArray(customCakesRes.data)) {
    customCakesRes.data.forEach((cc: any) => {
      if (cc?.user_id) {
        if (!customCakesByUser[cc.user_id]) {
          customCakesByUser[cc.user_id] = [];
        }
        customCakesByUser[cc.user_id].push(cc);
      }
    });
  }

  const mapped: Order[] = data.map((row: any) => {
    const parsed = parseCustomerContactFromOrder(row.customer, row.special_instructions);
    const linkedProfile = row.user_id ? profilesByUserId[row.user_id] : undefined;
    const createdAtDate = row.created_at ? new Date(row.created_at) : new Date();
    const isValidDate = !isNaN(createdAtDate.getTime());

    const formattedDate = isValidDate
      ? createdAtDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    const formattedTime = isValidDate
      ? createdAtDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      : '—';

    const resolvedName =
      parsed.name && parsed.name !== 'Guest' && parsed.name !== 'Customer'
        ? parsed.name
        : linkedProfile?.full_name || parsed.name || 'Customer';

    const resolvedEmail =
      row.customer_email ||
      parsed.email ||
      linkedProfile?.email ||
      (row.user_id === session?.user?.id ? session?.user?.email || '' : '') ||
      '—';

    const resolvedPhone =
      row.customer_phone ||
      parsed.phone ||
      linkedProfile?.phone ||
      '—';

    const { fullCakeName, cakeTypeDetail } = buildOrderCakeFullDetails(
      row,
      catalogList,
      customCakesByUser
    );

    return {
      id: row.order_code || row.id,
      userId: row.user_id,
      customer: resolvedName,
      customerEmail: resolvedEmail,
      customerPhone: resolvedPhone,
      cakeItem: fullCakeName,
      cakeTypeDetail,
      date: formattedDate,
      timeOfIssue: formattedTime,
      createdAt: row.created_at,
      status: (row.status as OrderStatus) || 'Pending',
      amount: Number(row.amount || 0),
      specialInstructions: row.special_instructions || '',
    };
  });

  const deletedOrderIds = new Set(readSharedStore<string[]>(SHARED_STORE_KEYS.deletedOrders, []));
  const sharedOrders = readSharedStore<Order[]>(SHARED_STORE_KEYS.orders, []);

  if (isAdmin) {
    const byId = new Map<string, Order>();
    // Load shared orders first, then overlay fresh DB orders, keeping status updates synced
    sharedOrders.forEach((ord) => {
      if (ord?.id && !deletedOrderIds.has(ord.id)) {
        byId.set(ord.id, ord);
      }
    });
    mapped.forEach((ord) => {
      if (ord?.id && !deletedOrderIds.has(ord.id)) {
        const existingShared = byId.get(ord.id);
        byId.set(ord.id, {
          ...ord,
          status: existingShared?.status || ord.status,
        });
      }
    });
    const unified = Array.from(byId.values()).sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
    writeSharedStore(SHARED_STORE_KEYS.orders, unified);
    return { data: unified, error: null };
  }

  return {
    data: mapped.filter((o) => !deletedOrderIds.has(o.id)),
    error: null,
  };
};

export const createOrderInDb = async (params: {
  orderCode?: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  items: CartItem[];
  specialInstructions?: string;
  amount: number;
}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const orderCode = params.orderCode || `#CZ-${Math.floor(1000 + Math.random() * 9000)}`;
  const cakeSummary = params.items
    .map((i) => {
      const fullName = ensureFullCakeTitle(i.name);
      return i.details ? `${i.quantity}x ${fullName} (${i.details})` : `${i.quantity}x ${fullName}`;
    })
    .join(' | ');
  const emailToStore = params.customerEmail || session?.user?.email || '';
  const phoneToStore = params.customerPhone || '';
  const createdAtIso = new Date().toISOString();

  const metaParts: string[] = [];
  if (params.specialInstructions) metaParts.push(params.specialInstructions);
  if (phoneToStore && !String(params.specialInstructions || '').includes('Contact:')) {
    metaParts.push(`Contact: ${phoneToStore}`);
  }
  if (emailToStore && !String(params.specialInstructions || '').includes('Email:')) {
    metaParts.push(`Email: ${emailToStore}`);
  }
  const combinedInstructions = metaParts.join(' | ');

  if (phoneToStore) {
    await supabase
      .from('profiles')
      .update({ phone: phoneToStore })
      .eq('user_id', userId);
  }

  // Insert with customer_email & customer_phone columns, falling back if columns were not added yet
  let { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_code: orderCode,
      customer: params.customer,
      customer_email: emailToStore,
      customer_phone: phoneToStore,
      cake_item: cakeSummary || 'Artisanal Cake Order',
      items: params.items,
      special_instructions: combinedInstructions,
      status: 'Pending',
      amount: Number(params.amount.toFixed(2)),
    })
    .select()
    .single();

  if (error) {
    const fallback = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        order_code: orderCode,
        customer: params.customer,
        cake_item: cakeSummary || 'Artisanal Cake Order',
        items: params.items,
        special_instructions: combinedInstructions,
        status: 'Pending',
        amount: Number(params.amount.toFixed(2)),
      })
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  // Also record the newly placed order into the shared admin orders cache so all admins see it immediately
  const nowDate = new Date(createdAtIso);
  const newOrderForAdmin: Order = {
    id: orderCode,
    userId,
    customer: params.customer || 'Customer',
    customerEmail: emailToStore || '—',
    customerPhone: phoneToStore || '—',
    cakeItem: cakeSummary || 'Artisanal Cake Order',
    cakeTypeDetail: params.items
      .map((i) =>
        /custom cake/i.test(i.name) || Number(i.price) === 0
          ? `Type: ${i.details || 'Custom Cake Design Request'}`
          : `Type: ${i.details || 'Artisanal Patisserie Cake'} · ₹${Number(i.price).toLocaleString(
              'en-IN'
            )}`
      )
      .join(' | '),
    date: nowDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    timeOfIssue: nowDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    createdAt: createdAtIso,
    status: 'Pending',
    amount: Number(params.amount.toFixed(2)),
    specialInstructions: combinedInstructions,
  };
  const existingSharedOrders = readSharedStore<Order[]>(SHARED_STORE_KEYS.orders, []);
  writeSharedStore(SHARED_STORE_KEYS.orders, [
    newOrderForAdmin,
    ...existingSharedOrders.filter((o) => o.id !== orderCode),
  ]);

  return { data, orderCode, error };
};

export const updateOrderStatusInDb = async (orderIdOrCode: string, status: OrderStatus) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);
  const column = orderIdOrCode.startsWith('#CZ-') ? 'order_code' : 'id';

  // Sync status across all admin accounts immediately
  const sharedOrders = readSharedStore<Order[]>(SHARED_STORE_KEYS.orders, []);
  if (sharedOrders.length > 0) {
    writeSharedStore(
      SHARED_STORE_KEYS.orders,
      sharedOrders.map((o) => (o.id === orderIdOrCode ? { ...o, status } : o))
    );
  }

  let query = supabase
    .from('orders')
    .update({ status })
    .eq(column, orderIdOrCode);

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().maybeSingle();
  return { data, error };
};

export const deleteOrderFromDb = async (orderIdOrCode: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);
  const column = orderIdOrCode.startsWith('#CZ-') ? 'order_code' : 'id';

  // Sync deletion across all admin accounts immediately
  const deletedOrders = readSharedStore<string[]>(SHARED_STORE_KEYS.deletedOrders, []);
  if (!deletedOrders.includes(orderIdOrCode)) {
    writeSharedStore(SHARED_STORE_KEYS.deletedOrders, [...deletedOrders, orderIdOrCode]);
  }
  const sharedOrders = readSharedStore<Order[]>(SHARED_STORE_KEYS.orders, []);
  writeSharedStore(
    SHARED_STORE_KEYS.orders,
    sharedOrders.filter((o) => o.id !== orderIdOrCode)
  );

  let query = supabase
    .from('orders')
    .delete()
    .eq(column, orderIdOrCode);

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  return { error };
};

// ============================================================================
// 4. CUSTOM CAKES CRUD & CONFIGURATOR DATA / PRICING (Supabase Queries)
// ============================================================================

export const DEFAULT_CUSTOM_CAKE_SETTINGS: CustomCakeBuilderSettings = {
  tiers: [
    { count: 1, label: '1 Tier', guests: '12 - 16 guests', price: 1499 },
    { count: 2, label: '2 Tiers', guests: '25 - 35 guests', price: 2799 },
    { count: 3, label: '3 Tiers', guests: '50 - 75 guests', price: 4499 },
    { count: 4, label: '4 Tiers', guests: '100+ guests', price: 6499 },
  ],
  accentPrice: 299,
  spongeFlavors: [
    'Valrhona Chocolate Fudge',
    'Madagascar Bourbon Vanilla Bean',
    'Kyoto Ceremonial Uji Matcha',
    'Red Velvet Cocoa & French Butter',
    'French Almond Frangipane',
  ],
  fillings: [
    'Fleur de Sel Caramel & Toasted Pecans',
    '70% Guanaja Dark Chocolate Truffle',
    'Wild Oregon Blackberry & Raspberry Coulis',
    'Belgian White Chocolate Opalys Mousse',
    'Crispy Hazelnut Praline Feuilletine',
  ],
  exteriorFinishes: [
    'Smooth Velvet Buttercream with Ganache Drips',
    'Mirror Smooth Valrhona Dark Ganache Glaze',
    'Rustic Semi-Naked with 24k Gold Edging',
    'Opulent Marble Royal Fondant Sculpture',
  ],
  accents: [
    '24k Edible Gold Leaf Flakes',
    'Cascading Pastel Sugar Peonies',
    'Handcrafted Macaron Crown',
    'Organic Forest Berries & Figs',
    'Polished Florentine Silver Leaf',
  ],
};

export const fetchCustomCakeSettings = async (): Promise<CustomCakeBuilderSettings> => {
  const sharedSettings = readSharedStore<CustomCakeBuilderSettings | null>(
    SHARED_STORE_KEYS.customCakeSettings,
    null
  );

  const { data, error } = await supabase
    .from('custom_cake_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (!error && data?.settings && typeof data.settings === 'object') {
    const merged: CustomCakeBuilderSettings = {
      ...DEFAULT_CUSTOM_CAKE_SETTINGS,
      ...(sharedSettings || {}),
      ...data.settings,
    };
    writeSharedStore(SHARED_STORE_KEYS.customCakeSettings, merged);
    return merged;
  }

  if (sharedSettings) {
    return {
      ...DEFAULT_CUSTOM_CAKE_SETTINGS,
      ...sharedSettings,
    };
  }

  return DEFAULT_CUSTOM_CAKE_SETTINGS;
};

export const saveCustomCakeSettings = async (
  settings: CustomCakeBuilderSettings
): Promise<{ data: CustomCakeBuilderSettings; error: any }> => {
  // Always save to shared store so all admin accounts and storefront see identical pricing & options
  writeSharedStore(SHARED_STORE_KEYS.customCakeSettings, settings);

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { data: settings, error: new Error('Not authenticated') };
  }

  const { error } = await supabase.from('custom_cake_settings').upsert(
    {
      id: 'default',
      user_id: userId,
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  return { data: settings, error };
};

export const fetchCustomCakes = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: [], error: null };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  let query = supabase
    .from('custom_cakes')
    .select('*')
    .order('created_at', { ascending: false });

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  const dbRows = (data as CustomCakeRecord[]) || [];

  const deletedIds = new Set(
    readSharedStore<string[]>(SHARED_STORE_KEYS.deletedCustomCakes, [])
  );
  const sharedRows = readSharedStore<CustomCakeRecord[]>(
    SHARED_STORE_KEYS.customCakes,
    []
  );

  if (isAdmin) {
    const byId = new Map<string, CustomCakeRecord>();
    sharedRows.forEach((r) => {
      if (r?.id && !deletedIds.has(r.id)) {
        byId.set(r.id, r);
      }
    });
    dbRows.forEach((r) => {
      if (r?.id && !deletedIds.has(r.id)) {
        const existing = byId.get(r.id);
        byId.set(r.id, { ...r, ...(existing || {}) });
      }
    });
    const unified = Array.from(byId.values());
    writeSharedStore(SHARED_STORE_KEYS.customCakes, unified);
    return { data: unified, error: null };
  }

  return {
    data: dbRows.filter((r) => !r.id || !deletedIds.has(r.id)),
    error,
  };
};

export const createCustomCakeInDb = async (cake: CustomCakeRecord) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('custom_cakes')
    .insert({
      user_id: userId,
      tiers: cake.tiers,
      sponge_flavor: cake.sponge_flavor,
      filling: cake.filling,
      exterior_finish: cake.exterior_finish,
      accents: cake.accents,
      inscription: cake.inscription,
      event_date: cake.event_date || null,
      estimated_price: cake.estimated_price,
    })
    .select()
    .single();

  const savedRecord: CustomCakeRecord = (data as CustomCakeRecord) || {
    ...cake,
    id: cake.id || generateUuid(),
    user_id: userId,
  };
  const sharedRows = readSharedStore<CustomCakeRecord[]>(
    SHARED_STORE_KEYS.customCakes,
    []
  );
  writeSharedStore(SHARED_STORE_KEYS.customCakes, [
    savedRecord,
    ...sharedRows.filter((r) => r.id !== savedRecord.id),
  ]);

  return { data: savedRecord, error };
};

export const updateCustomCakeInDb = async (
  id: string,
  updates: Partial<CustomCakeRecord>
) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  // Sync in shared custom cakes store immediately so all admins see the update
  const sharedRows = readSharedStore<CustomCakeRecord[]>(
    SHARED_STORE_KEYS.customCakes,
    []
  );
  let updatedSharedItem: CustomCakeRecord | null = null;
  if (sharedRows.length > 0) {
    const nextShared = sharedRows.map((item) => {
      if (item.id === id) {
        updatedSharedItem = { ...item, ...updates };
        return updatedSharedItem;
      }
      return item;
    });
    writeSharedStore(SHARED_STORE_KEYS.customCakes, nextShared);
  }

  const payload: Record<string, any> = {};
  if (typeof updates.tiers === 'number') payload.tiers = updates.tiers;
  if (typeof updates.sponge_flavor === 'string') payload.sponge_flavor = updates.sponge_flavor;
  if (typeof updates.filling === 'string') payload.filling = updates.filling;
  if (typeof updates.exterior_finish === 'string') payload.exterior_finish = updates.exterior_finish;
  if (Array.isArray(updates.accents)) payload.accents = updates.accents;
  if (typeof updates.inscription === 'string') payload.inscription = updates.inscription;
  if (typeof updates.event_date === 'string') payload.event_date = updates.event_date;
  if (typeof updates.estimated_price === 'number') payload.estimated_price = updates.estimated_price;

  let query = supabase.from('custom_cakes').update(payload).eq('id', id);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().maybeSingle();
  return {
    data: (data as CustomCakeRecord | null) || updatedSharedItem,
    error: updatedSharedItem ? null : error,
  };
};

export const deleteCustomCakeFromDb = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  const deletedIds = readSharedStore<string[]>(
    SHARED_STORE_KEYS.deletedCustomCakes,
    []
  );
  if (!deletedIds.includes(id)) {
    writeSharedStore(SHARED_STORE_KEYS.deletedCustomCakes, [...deletedIds, id]);
  }
  const sharedRows = readSharedStore<CustomCakeRecord[]>(
    SHARED_STORE_KEYS.customCakes,
    []
  );
  writeSharedStore(
    SHARED_STORE_KEYS.customCakes,
    sharedRows.filter((r) => r.id !== id)
  );

  let query = supabase.from('custom_cakes').delete().eq('id', id);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  return { error };
};

// ============================================================================
// 5. INVENTORY ITEMS CRUD (Load, Create, Update, Delete via Supabase)
// ============================================================================

export const fetchInventoryItems = async (): Promise<{ data: LowStockItem[]; error: any }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: [], error: null };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: true });

  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return { data: [], error };
  }

  const mapped: LowStockItem[] = data.map((row: any) => ({
    id: row.id,
    name: row.name,
    remaining: row.remaining,
    count: Number(row.count),
    unit: row.unit,
    icon: row.icon || 'inventory_2',
    isRestocked: Boolean(row.is_restocked),
  }));

  return { data: mapped, error: null };
};

export const createInventoryItemInDb = async (item: Omit<LowStockItem, 'id'>) => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      user_id: userId,
      name: item.name,
      remaining: item.remaining,
      count: item.count,
      unit: item.unit,
      icon: item.icon,
      is_restocked: Boolean(item.isRestocked),
    })
    .select()
    .single();

  return { data, error };
};

export const updateInventoryItemInDb = async (
  id: string,
  updates: { isRestocked?: boolean; remaining?: string; count?: number }
) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  const payload: Record<string, any> = {};
  if (typeof updates.isRestocked === 'boolean') payload.is_restocked = updates.isRestocked;
  if (typeof updates.remaining === 'string') payload.remaining = updates.remaining;
  if (typeof updates.count === 'number') payload.count = updates.count;

  let query = supabase.from('inventory_items').update(payload).eq('id', id);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.select().maybeSingle();
  return { data, error };
};

export const deleteInventoryItemFromDb = async (id: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  let query = supabase.from('inventory_items').delete().eq('id', id);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  return { error };
};

// ============================================================================
// 6. LOGGED-IN USERS TRACKING & QUERYING FROM SUPABASE (`profiles`)
// ============================================================================

export const recordUserLoginInSupabase = async (sessionUser?: any) => {
  let user = sessionUser;
  if (!user) {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user;
  }
  if (!user?.id) return;

  const email = (user.email || '').trim();
  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split('@')[0] ||
    'Member';
  const metaPhone = user.user_metadata?.phone || '';
  const isAdmin = isUserAdminSync(user);
  const nowIso = new Date().toISOString();

  // Record in shared admin users list immediately so all admins see every logged-in user
  const sharedUsers = readSharedStore<LoggedInUserRecord[]>(SHARED_STORE_KEYS.users, []);
  const existingShared = sharedUsers.find(
    (u) =>
      u.id === user.id ||
      (email && u.email.trim().toLowerCase() === email.toLowerCase())
  );
  const syncedUserRecord: LoggedInUserRecord = {
    id: user.id,
    name: existingShared?.name && existingShared.name !== 'Member' ? existingShared.name : metaName,
    email: email || existingShared?.email || '—',
    phone: existingShared?.phone && existingShared.phone !== '—' ? existingShared.phone : metaPhone || '—',
    role: isAdmin || existingShared?.role === 'Admin' ? 'Admin' : 'Customer',
    city: existingShared?.city || '—',
    lastLoginAt: nowIso,
    avatarUrl: existingShared?.avatarUrl || '',
  };
  writeSharedStore(SHARED_STORE_KEYS.users, [
    syncedUserRecord,
    ...sharedUsers.filter(
      (u) =>
        u.id !== user.id &&
        (!email || u.email.trim().toLowerCase() !== email.toLowerCase())
    ),
  ]);

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        full_name: metaName,
        email,
        phone: metaPhone,
        role: isAdmin ? 'Admin' : 'Customer',
      },
      { onConflict: 'user_id' }
    );
  } else {
    const updatedRole =
      isAdmin || String(existingProfile.role || '').toLowerCase() === 'admin'
        ? 'Admin'
        : 'Customer';
    await supabase
      .from('profiles')
      .update({
        email: existingProfile.email || email,
        role: updatedRole,
      })
      .eq('user_id', user.id);
  }
};

export const fetchAllLoggedInUsersFromSupabase = async (): Promise<{
  data: LoggedInUserRecord[];
  error: any;
}> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await recordUserLoginInSupabase(session.user);
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const dbMapped: LoggedInUserRecord[] =
    !error && Array.isArray(profiles)
      ? await Promise.all(
          profiles.map(async (row: any) => {
            const email = String(row.email || '').trim();
            const isAdminRole =
              String(row.role || '').trim().toLowerCase() === 'admin' ||
              isAdminEmail(email);

            let avatarUrl = row.avatar_url || '';
            if (!avatarUrl && Array.isArray(row.uploaded_files)) {
              const avatarFile = row.uploaded_files.find(
                (f: any) => f?.name && String(f.name).startsWith('__avatar__')
              );
              avatarUrl = avatarFile?.storagePath || avatarFile?.path || '';
            }
            if (avatarUrl && isStorageFilePath(avatarUrl)) {
              const signed = await createSignedUrlForAppFile(avatarUrl);
              avatarUrl = signed || '';
            }

            return {
              id: row.user_id || row.id,
              name: row.full_name || (email ? email.split('@')[0] : 'CakeZone User'),
              email: email || '—',
              phone: row.phone || '—',
              role: isAdminRole ? 'Admin' : 'Customer',
              city: row.city_code || row.city || row.address || '—',
              lastLoginAt:
                row.last_login_at ||
                row.updated_at ||
                row.created_at ||
                new Date().toISOString(),
              avatarUrl,
            };
          })
        )
      : [];

  // Merge DB profiles with shared admin users cache so all admins see the exact same logged-in people
  const sharedUsers = readSharedStore<LoggedInUserRecord[]>(SHARED_STORE_KEYS.users, []);
  const byKey = new Map<string, LoggedInUserRecord>();

  sharedUsers.forEach((u) => {
    const key = u.email && u.email !== '—' ? u.email.trim().toLowerCase() : u.id;
    if (key) {
      byKey.set(key, {
        ...u,
        role: isAdminEmail(u.email) || u.role === 'Admin' ? 'Admin' : 'Customer',
      });
    }
  });

  dbMapped.forEach((u) => {
    const key = u.email && u.email !== '—' ? u.email.trim().toLowerCase() : u.id;
    if (key) {
      const existing = byKey.get(key);
      byKey.set(key, {
        ...existing,
        ...u,
        phone: u.phone && u.phone !== '—' ? u.phone : existing?.phone || '—',
        city: u.city && u.city !== '—' ? u.city : existing?.city || '—',
        avatarUrl: u.avatarUrl || existing?.avatarUrl || '',
        role:
          isAdminEmail(u.email) || u.role === 'Admin' || existing?.role === 'Admin'
            ? 'Admin'
            : 'Customer',
      });
    }
  });

  // Ensure configured admin accounts are represented with their current active role
  const revokedSet = new Set(readSharedStore<string[]>(SHARED_STORE_KEYS.revokedAdmins, []));
  ADMIN_EMAILS.forEach((adminEmail) => {
    const clean = adminEmail.trim().toLowerCase();
    if (!byKey.has(clean)) {
      byKey.set(clean, {
        id: `admin-${clean.split('@')[0]}`,
        name: clean.split('@')[0].replace(/[._]/g, ' '),
        email: clean,
        phone: '—',
        role: revokedSet.has(clean) && clean !== PRIMARY_OWNER_ADMIN_EMAIL ? 'Customer' : 'Admin',
        city: '—',
        lastLoginAt: new Date().toISOString(),
        avatarUrl: '',
      });
    } else if (revokedSet.has(clean) && clean !== PRIMARY_OWNER_ADMIN_EMAIL) {
      const curr = byKey.get(clean)!;
      byKey.set(clean, { ...curr, role: 'Customer' });
    }
  });

  const unified = Array.from(byKey.values());
  writeSharedStore(SHARED_STORE_KEYS.users, unified);
  return { data: unified, error: null };
};

export const updateUserRoleInSupabase = async (params: {
  userId?: string;
  email: string;
  role: 'Admin' | 'Customer';
}): Promise<{ error: any; updatedCount: number }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return { error: new Error('Not authenticated'), updatedCount: 0 };
  }

  const isCallerAdmin = await resolveIsAdminFromSupabase(session.user);
  if (!isCallerAdmin) {
    return { error: new Error('Only an Admin can modify user roles.'), updatedCount: 0 };
  }

  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail) {
    return { error: new Error('Email is required.'), updatedCount: 0 };
  }

  // Only protect the root owner account from being demoted
  if (cleanEmail === PRIMARY_OWNER_ADMIN_EMAIL && params.role !== 'Admin') {
    return {
      error: new Error(`${PRIMARY_OWNER_ADMIN_EMAIL} is the primary owner account and cannot be removed from Admin.`),
      updatedCount: 0,
    };
  }

  // Update revoked / promoted lists so even emails in ADMIN_EMAILS can be removed or restored via UI
  const revoked = readSharedStore<string[]>(SHARED_STORE_KEYS.revokedAdmins, []);
  const promoted = readSharedStore<string[]>(SHARED_STORE_KEYS.promotedAdmins, []);
  if (params.role === 'Customer') {
    if (!revoked.includes(cleanEmail)) {
      writeSharedStore(SHARED_STORE_KEYS.revokedAdmins, [...revoked, cleanEmail]);
    }
    writeSharedStore(
      SHARED_STORE_KEYS.promotedAdmins,
      promoted.filter((e) => e !== cleanEmail)
    );
  } else {
    writeSharedStore(
      SHARED_STORE_KEYS.revokedAdmins,
      revoked.filter((e) => e !== cleanEmail)
    );
    if (!promoted.includes(cleanEmail)) {
      writeSharedStore(SHARED_STORE_KEYS.promotedAdmins, [...promoted, cleanEmail]);
    }
  }

  // Update shared admin user store so all admins see the updated role
  const sharedUsers = readSharedStore<LoggedInUserRecord[]>(SHARED_STORE_KEYS.users, []);
  let matchedShared = false;
  const updatedShared = sharedUsers.map((u) => {
    if (
      (params.userId && u.id === params.userId) ||
      u.email.trim().toLowerCase() === cleanEmail
    ) {
      matchedShared = true;
      return { ...u, role: params.role };
    }
    return u;
  });
  if (!matchedShared) {
    updatedShared.unshift({
      id: params.userId || `user-${cleanEmail.split('@')[0]}`,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '—',
      role: params.role,
      city: '—',
      lastLoginAt: new Date().toISOString(),
      avatarUrl: '',
    });
  }
  writeSharedStore(SHARED_STORE_KEYS.users, updatedShared);

  if (params.userId && !params.userId.startsWith('admin-') && !params.userId.startsWith('user-')) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: params.role })
      .eq('user_id', params.userId)
      .select();

    if (!error && data && data.length > 0) {
      return { error: null, updatedCount: data.length };
    }
  }

  const { data: byEmail, error: emailError } = await supabase
    .from('profiles')
    .update({ role: params.role })
    .ilike('email', cleanEmail)
    .select();

  if (emailError) {
    return { error: null, updatedCount: 1 };
  }

  return { error: null, updatedCount: Math.max(byEmail?.length || 0, 1) };
};

// ============================================================================
// 7. PRODUCTS CATALOG CRUD (Load, Create, Update, Delete via Supabase `products`)
// ============================================================================

const resolveProductImageSignedUrl = async (cake: CakeProduct): Promise<CakeProduct> => {
  const imageFallbacks = readSharedStore<Record<string, string>>(
    SHARED_STORE_KEYS.productImageFallbacks,
    {}
  );
  const pathCandidate = cake.storagePath || (isStorageFilePath(cake.image) ? cake.image : '');
  if (pathCandidate && isStorageFilePath(pathCandidate)) {
    const signedUrl = await createSignedUrlForAppFile(pathCandidate);
    if (signedUrl) {
      return {
        ...cake,
        image: signedUrl,
        storagePath: pathCandidate,
      };
    }
    if (imageFallbacks[cake.id]) {
      return {
        ...cake,
        image: imageFallbacks[cake.id],
        storagePath: pathCandidate,
      };
    }
  }
  if (isStorageFilePath(cake.image) && imageFallbacks[cake.id]) {
    return {
      ...cake,
      image: imageFallbacks[cake.id],
    };
  }
  return cake;
};

export const fetchCakeProducts = async (): Promise<{ data: CakeProduct[]; error: any }> => {
  const deletedProductIds = new Set(
    readSharedStore<string[]>(SHARED_STORE_KEYS.deletedProducts, [])
  );
  const sharedProducts = readSharedStore<CakeProduct[]>(
    SHARED_STORE_KEYS.products,
    []
  );

  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  // If the Supabase `products` table is empty and an authenticated user is logged in, seed initial catalog items into Supabase
  if (!error && (!dbProducts || dbProducts.length === 0) && sharedProducts.length === 0) {
    const userId = await getAuthenticatedUserId();
    if (userId) {
      const seedPayload = SIGNATURE_CAKES.filter((c) => !deletedProductIds.has(c.id)).map(
        (cake) => ({
          id: cake.id,
          user_id: userId,
          name: cake.name,
          caption: cake.tags?.[1] || cake.category,
          price: cake.price,
          rating: cake.rating,
          reviews_count: cake.reviewsCount,
          category: cake.category,
          description: cake.description,
          image: cake.image,
          storage_path: null,
          ingredients: cake.ingredients,
          servings: cake.servings,
          tags: cake.tags,
        })
      );
      if (seedPayload.length > 0) {
        await supabase.from('products').upsert(seedPayload, { onConflict: 'id' });
      }
    }
  }

  const mappedDb: CakeProduct[] = Array.isArray(dbProducts)
    ? dbProducts.map((row: any) => ({
        id: String(row.id),
        name: row.name || 'Artisanal Cake',
        caption: row.caption || (Array.isArray(row.tags) && row.tags[1]) || 'Signature',
        price: Number(row.price || 899),
        rating: Number(row.rating ?? 4.8),
        reviewsCount: Number(row.reviews_count ?? 50),
        category: row.category || 'Chocolate',
        description: row.description || '',
        image: row.image || '/assets/aistudio/cake_chocolate_truffle.png',
        storagePath: row.storage_path || (isStorageFilePath(row.image) ? row.image : undefined),
        ingredients:
          row.ingredients || 'Pure French butter, organic flour, Madagascar vanilla.',
        servings: row.servings || '8 - 10 Servings',
        tags: Array.isArray(row.tags)
          ? row.tags
          : [row.category || 'Signature', row.caption || 'Fresh'].filter(Boolean),
      }))
    : [];

  const byId = new Map<string, CakeProduct>();

  // Base signature cakes (unless deleted by an admin)
  SIGNATURE_CAKES.forEach((cake) => {
    if (!deletedProductIds.has(cake.id)) {
      byId.set(cake.id, cake);
    }
  });

  // Shared admin products (inserted/edited by any admin)
  sharedProducts.forEach((cake) => {
    if (cake?.id && !deletedProductIds.has(cake.id)) {
      byId.set(cake.id, cake);
    }
  });

  // Live Supabase products (overlaying DB rows unless updated in shared store)
  mappedDb.forEach((cake) => {
    if (cake?.id && !deletedProductIds.has(cake.id)) {
      const sharedOverride = sharedProducts.find((sp) => sp.id === cake.id);
      byId.set(cake.id, sharedOverride ? { ...cake, ...sharedOverride } : cake);
    }
  });

  const mergedList = Array.from(byId.values());
  const resolved = await Promise.all(mergedList.map((p) => resolveProductImageSignedUrl(p)));
  writeSharedStore(SHARED_STORE_KEYS.products, resolved);
  return { data: resolved, error: null };
};

export const insertCakeProductInDb = async (
  input: {
    name: string;
    caption: string;
    price: number;
    rating: number;
    reviewsCount?: number;
    category: CakeProduct['category'];
    description: string;
    imageUrl?: string;
    ingredients?: string;
    servings?: string;
  },
  imageFile?: File | null
): Promise<{ data: CakeProduct | null; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const slugId = `${input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

  let finalImageUrl = input.imageUrl?.trim() || '/assets/aistudio/cake_chocolate_truffle.png';
  let uploadedStoragePath: string | undefined;
  let dataUrlFallback = '';

  if (imageFile) {
    dataUrlFallback = await fileToDataUrl(imageFile);
    const uploadResult = await uploadFileToAppStorage({
      file: imageFile,
      featureName: 'products',
      itemId: slugId,
    });
    if (uploadResult.storagePath) {
      uploadedStoragePath = uploadResult.storagePath;
      finalImageUrl = uploadResult.signedUrl || dataUrlFallback || uploadResult.storagePath;
    } else if (dataUrlFallback) {
      finalImageUrl = dataUrlFallback;
    } else if (uploadResult.error) {
      return { data: null, error: uploadResult.error };
    }
  }

  if (dataUrlFallback) {
    const imageFallbacks = readSharedStore<Record<string, string>>(
      SHARED_STORE_KEYS.productImageFallbacks,
      {}
    );
    imageFallbacks[slugId] = dataUrlFallback;
    writeSharedStore(SHARED_STORE_KEYS.productImageFallbacks, imageFallbacks);
  }

  const tags = [input.category, input.caption].filter(Boolean);

  const { data: insertedRow } = await supabase
    .from('products')
    .insert({
      id: slugId,
      user_id: userId,
      name: input.name.trim(),
      caption: input.caption.trim() || 'New Arrival',
      price: Number(input.price) || 899,
      rating: Math.min(5, Math.max(1, Number(input.rating) || 4.9)),
      reviews_count: Number(input.reviewsCount ?? 1),
      category: input.category,
      description: input.description.trim(),
      image: uploadedStoragePath || finalImageUrl,
      storage_path: uploadedStoragePath || null,
      ingredients:
        input.ingredients?.trim() ||
        'Artisanal sponge, pure French butter, Madagascar Bourbon vanilla.',
      servings: input.servings?.trim() || '8 - 10 Servings',
      tags,
    })
    .select()
    .maybeSingle();

  const createdProduct: CakeProduct = {
    id: String(insertedRow?.id || slugId),
    name: insertedRow?.name || input.name.trim(),
    caption: insertedRow?.caption || input.caption.trim() || 'New Arrival',
    price: Number(insertedRow?.price ?? input.price ?? 899),
    rating: Number(insertedRow?.rating ?? input.rating ?? 4.9),
    reviewsCount: Number(insertedRow?.reviews_count ?? input.reviewsCount ?? 1),
    category: insertedRow?.category || input.category,
    description: insertedRow?.description || input.description.trim(),
    image: finalImageUrl,
    storagePath: uploadedStoragePath,
    ingredients:
      insertedRow?.ingredients ||
      input.ingredients?.trim() ||
      'Artisanal sponge, pure French butter, Madagascar Bourbon vanilla.',
    servings: insertedRow?.servings || input.servings?.trim() || '8 - 10 Servings',
    tags: Array.isArray(insertedRow?.tags) ? insertedRow.tags : tags,
  };

  // Sync newly inserted product across all admin accounts
  const sharedProducts = readSharedStore<CakeProduct[]>(SHARED_STORE_KEYS.products, []);
  writeSharedStore(SHARED_STORE_KEYS.products, [
    createdProduct,
    ...sharedProducts.filter((p) => p.id !== createdProduct.id),
  ]);

  return { data: createdProduct, error: null };
};

export const updateCakeProductInDb = async (
  productId: string,
  updates: Partial<{
    name: string;
    caption: string;
    price: number;
    rating: number;
    reviewsCount: number;
    category: CakeProduct['category'];
    description: string;
    ingredients: string;
    servings: string;
  }>
): Promise<{ data: CakeProduct | null; error: any }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  // Update shared admin products store so all admins see the edit even if DB row belongs to another admin
  const sharedProducts = readSharedStore<CakeProduct[]>(SHARED_STORE_KEYS.products, []);
  let updatedSharedProduct: CakeProduct | null = null;
  const nextShared = sharedProducts.map((p) => {
    if (p.id === productId) {
      updatedSharedProduct = {
        ...p,
        ...(typeof updates.name === 'string' ? { name: updates.name.trim() } : {}),
        ...(typeof updates.caption === 'string' ? { caption: updates.caption.trim() } : {}),
        ...(typeof updates.price === 'number' ? { price: updates.price } : {}),
        ...(typeof updates.rating === 'number' ? { rating: updates.rating } : {}),
        ...(typeof updates.reviewsCount === 'number'
          ? { reviewsCount: updates.reviewsCount }
          : {}),
        ...(typeof updates.category === 'string' ? { category: updates.category } : {}),
        ...(typeof updates.description === 'string'
          ? { description: updates.description.trim() }
          : {}),
        ...(typeof updates.ingredients === 'string'
          ? { ingredients: updates.ingredients.trim() }
          : {}),
        ...(typeof updates.servings === 'string' ? { servings: updates.servings.trim() } : {}),
      };
      return updatedSharedProduct;
    }
    return p;
  });
  if (updatedSharedProduct) {
    writeSharedStore(SHARED_STORE_KEYS.products, nextShared);
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof updates.name === 'string') payload.name = updates.name.trim();
  if (typeof updates.caption === 'string') payload.caption = updates.caption.trim();
  if (typeof updates.price === 'number') payload.price = updates.price;
  if (typeof updates.rating === 'number') payload.rating = updates.rating;
  if (typeof updates.reviewsCount === 'number') payload.reviews_count = updates.reviewsCount;
  if (typeof updates.category === 'string') payload.category = updates.category;
  if (typeof updates.description === 'string') payload.description = updates.description.trim();
  if (typeof updates.ingredients === 'string') payload.ingredients = updates.ingredients.trim();
  if (typeof updates.servings === 'string') payload.servings = updates.servings.trim();

  let query = supabase.from('products').update(payload).eq('id', productId);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data: row, error } = await query.select().maybeSingle();
  if (!row) {
    return {
      data: updatedSharedProduct,
      error: updatedSharedProduct ? null : error,
    };
  }

  const mapped: CakeProduct = await resolveProductImageSignedUrl({
    id: String(row.id),
    name: row.name,
    caption: row.caption || 'Signature',
    price: Number(row.price),
    rating: Number(row.rating ?? 4.8),
    reviewsCount: Number(row.reviews_count ?? 50),
    category: row.category || 'Chocolate',
    description: row.description || '',
    image: row.image,
    storagePath: row.storage_path || undefined,
    ingredients: row.ingredients || '',
    servings: row.servings || '8 - 10 Servings',
    tags: Array.isArray(row.tags) ? row.tags : [row.category],
  });

  return { data: mapped, error: null };
};

export const deleteCakeProductFromDb = async (
  productId: string,
  storagePath?: string
): Promise<{ error: any }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { error: new Error('Not authenticated') };

  const isAdmin = await resolveIsAdminFromSupabase(session?.user);

  // Record deletion in shared admin store so the deleted item disappears for all admins
  const deletedProducts = readSharedStore<string[]>(SHARED_STORE_KEYS.deletedProducts, []);
  if (!deletedProducts.includes(productId)) {
    writeSharedStore(SHARED_STORE_KEYS.deletedProducts, [...deletedProducts, productId]);
  }
  const sharedProducts = readSharedStore<CakeProduct[]>(SHARED_STORE_KEYS.products, []);
  writeSharedStore(
    SHARED_STORE_KEYS.products,
    sharedProducts.filter((p) => p.id !== productId)
  );

  if (storagePath && isStorageFilePath(storagePath)) {
    await removeFileFromAppStorage(storagePath);
  }

  let query = supabase.from('products').delete().eq('id', productId);
  if (!isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;
  return { error };
};

const REGISTERED_EMAILS_STORE_KEY = 'cakezone_registered_emails_v1';

export const registerKnownAccountEmail = async (
  email: string,
  fullName?: string,
  userId?: string
): Promise<void> => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return;

  const knownEmails = readSharedStore<string[]>(REGISTERED_EMAILS_STORE_KEY, []);
  if (!knownEmails.includes(cleanEmail)) {
    writeSharedStore(REGISTERED_EMAILS_STORE_KEY, [cleanEmail, ...knownEmails]);
  }

  const sharedUsers = readSharedStore<LoggedInUserRecord[]>(SHARED_STORE_KEYS.users, []);
  const existsInShared = sharedUsers.some(
    (u) => u.email && u.email.trim().toLowerCase() === cleanEmail
  );
  if (!existsInShared) {
    const displayName = (fullName || '').trim() || cleanEmail.split('@')[0];
    writeSharedStore(SHARED_STORE_KEYS.users, [
      {
        id: userId || `user-${cleanEmail.split('@')[0]}`,
        name: displayName,
        email: cleanEmail,
        phone: '—',
        role: isAdminEmail(cleanEmail) ? 'Admin' : 'Customer',
        city: '—',
        lastLoginAt: new Date().toISOString(),
        avatarUrl: '',
      },
      ...sharedUsers,
    ]);
  }

  if (userId) {
    try {
      await supabase.from('profiles').upsert(
        {
          user_id: userId,
          full_name: (fullName || '').trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: isAdminEmail(cleanEmail) ? 'Admin' : 'Customer',
        },
        { onConflict: 'user_id' }
      );
    } catch {
      // Ignore if RLS blocks unconfirmed signup insert
    }
  }
};

export const checkAccountExistsByEmail = async (email: string): Promise<boolean> => {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return false;

  if (isAdminEmail(cleanEmail)) {
    return true;
  }

  const knownEmails = readSharedStore<string[]>(REGISTERED_EMAILS_STORE_KEY, []);
  if (knownEmails.some((e) => e.trim().toLowerCase() === cleanEmail)) {
    return true;
  }

  const sharedUsers = readSharedStore<LoggedInUserRecord[]>(SHARED_STORE_KEYS.users, []);
  if (sharedUsers.some((u) => u.email && u.email.trim().toLowerCase() === cleanEmail)) {
    return true;
  }

  if (typeof window !== 'undefined') {
    const signupEmail = (sessionStorage.getItem('cakezone_signup_email') || '').trim().toLowerCase();
    if (signupEmail && signupEmail === cleanEmail) {
      return true;
    }
  }

  try {
    const { data: profileMatch } = await supabase
      .from('profiles')
      .select('email')
      .ilike('email', cleanEmail)
      .limit(1);

    if (Array.isArray(profileMatch) && profileMatch.length > 0) {
      await registerKnownAccountEmail(cleanEmail);
      return true;
    }
  } catch {
    // Ignore table query errors
  }

  try {
    const { data: orderMatch } = await supabase
      .from('orders')
      .select('customer_email')
      .ilike('customer_email', cleanEmail)
      .limit(1);

    if (Array.isArray(orderMatch) && orderMatch.length > 0) {
      await registerKnownAccountEmail(cleanEmail);
      return true;
    }
  } catch {
    // Ignore table query errors
  }

  return false;
};

// ============================================================================
// 8. INSPIRATION GALLERY SECTION CRUD & CAKE IMAGE UPLOAD (`gallery_items` & `gallery_settings`)
// All rows belong to the authenticated user (`user_id = auth.uid()`) via RLS policies
// ============================================================================

export const uploadGalleryCakeImage = async (
  file: File,
  itemId?: string
): Promise<{
  storagePath: string | null;
  signedUrl: string | null;
  dataUrlFallback: string;
  error: any;
}> => {
  const dataUrlFallback = await fileToDataUrl(file);
  const uploadResult = await uploadFileToAppStorage({
    file,
    featureName: 'gallery-cakes',
    itemId: itemId || `gallery-${Date.now()}`,
  });

  return {
    storagePath: uploadResult.storagePath,
    signedUrl: uploadResult.signedUrl || dataUrlFallback || null,
    dataUrlFallback,
    error: uploadResult.error,
  };
};

const resolveGalleryItemImageSignedUrl = async (item: GalleryItem): Promise<GalleryItem> => {
  const imageFallbacks = readSharedStore<Record<string, string>>(
    SHARED_STORE_KEYS.galleryImageFallbacks,
    {}
  );
  const pathCandidate = item.storagePath || (isStorageFilePath(item.image) ? item.image : '');
  if (pathCandidate && isStorageFilePath(pathCandidate)) {
    const signedUrl = await createSignedUrlForAppFile(pathCandidate);
    if (signedUrl) {
      return {
        ...item,
        image: signedUrl,
        storagePath: pathCandidate,
      };
    }
    if (imageFallbacks[item.id]) {
      return {
        ...item,
        image: imageFallbacks[item.id],
        storagePath: pathCandidate,
      };
    }
  }
  if (isStorageFilePath(item.image) && imageFallbacks[item.id]) {
    return {
      ...item,
      image: imageFallbacks[item.id],
    };
  }
  return item;
};

export const fetchGallerySectionSettings = async (): Promise<GallerySectionSettings> => {
  const sharedSettings = readSharedStore<GallerySectionSettings | null>(
    SHARED_STORE_KEYS.gallerySettings,
    null
  );

  const userId = await getAuthenticatedUserId();
  if (userId) {
    const { data, error } = await supabase
      .from('gallery_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const resolved: GallerySectionSettings = {
        heading: data.heading || DEFAULT_GALLERY_SECTION_SETTINGS.heading,
        subHeading: data.sub_heading || DEFAULT_GALLERY_SECTION_SETTINGS.subHeading,
        description: data.description || DEFAULT_GALLERY_SECTION_SETTINGS.description,
      };
      writeSharedStore(SHARED_STORE_KEYS.gallerySettings, resolved);
      return resolved;
    }
  }

  if (sharedSettings) {
    return {
      ...DEFAULT_GALLERY_SECTION_SETTINGS,
      ...sharedSettings,
    };
  }

  return DEFAULT_GALLERY_SECTION_SETTINGS;
};

export const saveGallerySectionSettings = async (
  settings: GallerySectionSettings
): Promise<{ data: GallerySectionSettings; error: any }> => {
  writeSharedStore(SHARED_STORE_KEYS.gallerySettings, settings);

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return { data: settings, error: new Error('Not authenticated') };
  }

  const { error } = await supabase.from('gallery_settings').upsert(
    {
      user_id: userId,
      heading: settings.heading.trim() || DEFAULT_GALLERY_SECTION_SETTINGS.heading,
      sub_heading: settings.subHeading.trim() || DEFAULT_GALLERY_SECTION_SETTINGS.subHeading,
      description: settings.description.trim() || DEFAULT_GALLERY_SECTION_SETTINGS.description,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  return { data: settings, error };
};

export const fetchGalleryItems = async (): Promise<{ data: GalleryItem[]; error: any }> => {
  const deletedGalleryIds = new Set(
    readSharedStore<string[]>(SHARED_STORE_KEYS.deletedGalleryItems, [])
  );
  const sharedGallery = readSharedStore<GalleryItem[]>(
    SHARED_STORE_KEYS.galleryItems,
    []
  );

  const userId = await getAuthenticatedUserId();
  let dbRows: any[] | null = null;
  let dbError: any = null;

  if (userId) {
    const { data, error } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    dbRows = data;
    dbError = error;

    // Seed initial gallery items for the authenticated user if their `gallery_items` table is empty
    if (!dbError && (!dbRows || dbRows.length === 0) && sharedGallery.length === 0) {
      const seedPayload = INITIAL_GALLERY_ITEMS.filter(
        (item) => !deletedGalleryIds.has(item.id)
      ).map((item, idx) => ({
        id: item.id,
        user_id: userId,
        title: item.title,
        sub_heading: item.subHeading || '',
        description: item.description,
        item_type: item.category,
        image_url: item.image,
        storage_path: null,
        fallback_image: item.fallbackImage,
        servings: item.servings,
        lead_time: item.leadTime,
        marquee_row: item.rowNumber,
        display_order: item.displayOrder ?? idx + 1,
      }));

      if (seedPayload.length > 0) {
        const { data: seeded } = await supabase
          .from('gallery_items')
          .upsert(seedPayload, { onConflict: 'id' })
          .select('*');
        if (Array.isArray(seeded) && seeded.length > 0) {
          dbRows = seeded;
        }
      }
    }
  }

  const mappedDb: GalleryItem[] = Array.isArray(dbRows)
    ? dbRows.map((row: any, idx: number) => ({
        id: String(row.id),
        userId: row.user_id,
        category: row.item_type || row.category || 'BESPOKE ROYAL',
        title: row.title || row.heading || 'Artisanal Creation',
        subHeading: row.sub_heading || row.signature_notes || '',
        description: row.description || '',
        image: row.image_url || row.image || '/assets/aistudio/cake_designer.png',
        storagePath:
          row.storage_path ||
          (isStorageFilePath(row.image_url || row.image)
            ? row.image_url || row.image
            : undefined),
        fallbackImage: row.fallback_image || '/assets/aistudio/cake_designer.png',
        servings: row.servings || '10 - 14 Servings',
        leadTime: row.lead_time || '24 Hours Notice',
        rowNumber: Number(row.marquee_row || row.row_number) === 2 ? 2 : 1,
        displayOrder: Number(row.display_order ?? idx + 1),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    : [];

  const byId = new Map<string, GalleryItem>();

  INITIAL_GALLERY_ITEMS.forEach((item) => {
    if (!deletedGalleryIds.has(item.id)) {
      byId.set(item.id, item);
    }
  });

  sharedGallery.forEach((item) => {
    if (item?.id && !deletedGalleryIds.has(item.id)) {
      byId.set(item.id, item);
    }
  });

  mappedDb.forEach((item) => {
    if (item?.id && !deletedGalleryIds.has(item.id)) {
      const sharedOverride = sharedGallery.find((sg) => sg.id === item.id);
      byId.set(item.id, sharedOverride ? { ...item, ...sharedOverride } : item);
    }
  });

  const mergedList = Array.from(byId.values()).sort(
    (a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99)
  );
  const resolved = await Promise.all(
    mergedList.map((item) => resolveGalleryItemImageSignedUrl(item))
  );
  writeSharedStore(SHARED_STORE_KEYS.galleryItems, resolved);

  return { data: resolved, error: null };
};

export const createGalleryItemInDb = async (
  input: {
    title: string;
    subHeading?: string;
    category: string;
    description: string;
    imageUrl?: string;
    fallbackImage?: string;
    servings?: string;
    leadTime?: string;
    rowNumber?: 1 | 2;
    displayOrder?: number;
  },
  imageFile?: File | null
): Promise<{ data: GalleryItem | null; error: any }> => {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  const slugId = `insp-${input.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;

  let finalImageUrl = input.imageUrl?.trim() || '/assets/aistudio/cake_designer.png';
  let uploadedStoragePath: string | undefined;
  let dataUrlFallback = '';

  if (imageFile) {
    const uploadRes = await uploadGalleryCakeImage(imageFile, slugId);
    dataUrlFallback = uploadRes.dataUrlFallback;
    if (uploadRes.storagePath) {
      uploadedStoragePath = uploadRes.storagePath;
      finalImageUrl = uploadRes.signedUrl || dataUrlFallback || uploadRes.storagePath;
    } else if (dataUrlFallback) {
      finalImageUrl = dataUrlFallback;
    } else if (uploadRes.error) {
      return { data: null, error: uploadRes.error };
    }
  }

  if (dataUrlFallback) {
    const imageFallbacks = readSharedStore<Record<string, string>>(
      SHARED_STORE_KEYS.galleryImageFallbacks,
      {}
    );
    imageFallbacks[slugId] = dataUrlFallback;
    writeSharedStore(SHARED_STORE_KEYS.galleryImageFallbacks, imageFallbacks);
  }

  const rowNumber: 1 | 2 = input.rowNumber === 2 ? 2 : 1;
  const cleanCategory = (input.category || 'BESPOKE ROYAL').trim().toUpperCase();

  const { data: insertedRow } = await supabase
    .from('gallery_items')
    .insert({
      id: slugId,
      user_id: userId,
      title: input.title.trim(),
      sub_heading:
        input.subHeading?.trim() ||
        'Artisanal Sponge · Pure French Buttercream · Bespoke Finishing',
      description: input.description.trim(),
      item_type: cleanCategory,
      image_url: uploadedStoragePath || finalImageUrl,
      storage_path: uploadedStoragePath || null,
      fallback_image: input.fallbackImage?.trim() || '/assets/aistudio/cake_designer.png',
      servings: input.servings?.trim() || '10 - 14 Servings',
      lead_time: input.leadTime?.trim() || '24 Hours Notice',
      marquee_row: rowNumber,
      display_order: input.displayOrder ?? 1,
    })
    .select('*')
    .maybeSingle();

  const createdItem: GalleryItem = {
    id: String(insertedRow?.id || slugId),
    userId,
    category: insertedRow?.item_type || cleanCategory,
    title: insertedRow?.title || input.title.trim(),
    subHeading:
      insertedRow?.sub_heading ||
      input.subHeading?.trim() ||
      'Artisanal Sponge · Pure French Buttercream · Bespoke Finishing',
    description: insertedRow?.description || input.description.trim(),
    image: finalImageUrl,
    storagePath: uploadedStoragePath,
    fallbackImage:
      insertedRow?.fallback_image ||
      input.fallbackImage?.trim() ||
      '/assets/aistudio/cake_designer.png',
    servings: insertedRow?.servings || input.servings?.trim() || '10 - 14 Servings',
    leadTime: insertedRow?.lead_time || input.leadTime?.trim() || '24 Hours Notice',
    rowNumber: Number(insertedRow?.marquee_row ?? rowNumber) === 2 ? 2 : 1,
    displayOrder: Number(insertedRow?.display_order ?? input.displayOrder ?? 1),
    createdAt: insertedRow?.created_at || new Date().toISOString(),
  };

  const sharedGallery = readSharedStore<GalleryItem[]>(SHARED_STORE_KEYS.galleryItems, []);
  writeSharedStore(SHARED_STORE_KEYS.galleryItems, [
    createdItem,
    ...sharedGallery.filter((g) => g.id !== createdItem.id),
  ]);

  return { data: createdItem, error: null };
};

export const updateGalleryItemInDb = async (
  itemId: string,
  updates: Partial<{
    title: string;
    subHeading: string;
    category: string;
    description: string;
    imageUrl: string;
    servings: string;
    leadTime: string;
    rowNumber: 1 | 2;
    displayOrder: number;
  }>,
  newImageFile?: File | null
): Promise<{ data: GalleryItem | null; error: any }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { data: null, error: new Error('Not authenticated') };

  let uploadedStoragePath: string | undefined;
  let uploadedImageUrl: string | undefined;

  if (newImageFile) {
    const uploadRes = await uploadGalleryCakeImage(newImageFile, itemId);
    if (uploadRes.storagePath) {
      uploadedStoragePath = uploadRes.storagePath;
      uploadedImageUrl =
        uploadRes.signedUrl || uploadRes.dataUrlFallback || uploadRes.storagePath;
    } else if (uploadRes.dataUrlFallback) {
      uploadedImageUrl = uploadRes.dataUrlFallback;
    }

    if (uploadRes.dataUrlFallback) {
      const imageFallbacks = readSharedStore<Record<string, string>>(
        SHARED_STORE_KEYS.galleryImageFallbacks,
        {}
      );
      imageFallbacks[itemId] = uploadRes.dataUrlFallback;
      writeSharedStore(SHARED_STORE_KEYS.galleryImageFallbacks, imageFallbacks);
    }
  } else if (typeof updates.imageUrl === 'string' && updates.imageUrl.trim()) {
    uploadedImageUrl = updates.imageUrl.trim();
  }

  // Update shared store immediately
  const sharedGallery = readSharedStore<GalleryItem[]>(SHARED_STORE_KEYS.galleryItems, []);
  let updatedSharedItem: GalleryItem | null = null;
  const nextShared = sharedGallery.map((g) => {
    if (g.id === itemId) {
      updatedSharedItem = {
        ...g,
        ...(typeof updates.title === 'string' ? { title: updates.title.trim() } : {}),
        ...(typeof updates.subHeading === 'string'
          ? { subHeading: updates.subHeading.trim() }
          : {}),
        ...(typeof updates.category === 'string'
          ? { category: updates.category.trim().toUpperCase() }
          : {}),
        ...(typeof updates.description === 'string'
          ? { description: updates.description.trim() }
          : {}),
        ...(uploadedImageUrl ? { image: uploadedImageUrl } : {}),
        ...(uploadedStoragePath ? { storagePath: uploadedStoragePath } : {}),
        ...(typeof updates.servings === 'string' ? { servings: updates.servings.trim() } : {}),
        ...(typeof updates.leadTime === 'string' ? { leadTime: updates.leadTime.trim() } : {}),
        ...(updates.rowNumber === 1 || updates.rowNumber === 2
          ? { rowNumber: updates.rowNumber }
          : {}),
        ...(typeof updates.displayOrder === 'number'
          ? { displayOrder: updates.displayOrder }
          : {}),
      };
      return updatedSharedItem;
    }
    return g;
  });

  if (updatedSharedItem) {
    writeSharedStore(SHARED_STORE_KEYS.galleryItems, nextShared);
  }

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof updates.title === 'string') payload.title = updates.title.trim();
  if (typeof updates.subHeading === 'string') payload.sub_heading = updates.subHeading.trim();
  if (typeof updates.category === 'string')
    payload.item_type = updates.category.trim().toUpperCase();
  if (typeof updates.description === 'string') payload.description = updates.description.trim();
  if (uploadedStoragePath) {
    payload.image_url = uploadedStoragePath;
    payload.storage_path = uploadedStoragePath;
  } else if (uploadedImageUrl) {
    payload.image_url = uploadedImageUrl;
  }
  if (typeof updates.servings === 'string') payload.servings = updates.servings.trim();
  if (typeof updates.leadTime === 'string') payload.lead_time = updates.leadTime.trim();
  if (updates.rowNumber === 1 || updates.rowNumber === 2) payload.marquee_row = updates.rowNumber;
  if (typeof updates.displayOrder === 'number') payload.display_order = updates.displayOrder;

  const { data: row, error } = await supabase
    .from('gallery_items')
    .update(payload)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (!row) {
    return {
      data: updatedSharedItem,
      error: updatedSharedItem ? null : error,
    };
  }

  const mapped: GalleryItem = await resolveGalleryItemImageSignedUrl({
    id: String(row.id),
    userId: row.user_id,
    category: row.item_type || 'BESPOKE ROYAL',
    title: row.title,
    subHeading: row.sub_heading || '',
    description: row.description || '',
    image: uploadedImageUrl || row.image_url,
    storagePath: row.storage_path || undefined,
    fallbackImage: row.fallback_image || '/assets/aistudio/cake_designer.png',
    servings: row.servings || '10 - 14 Servings',
    leadTime: row.lead_time || '24 Hours Notice',
    rowNumber: Number(row.marquee_row) === 2 ? 2 : 1,
    displayOrder: Number(row.display_order ?? 1),
    updatedAt: row.updated_at,
  });

  return { data: mapped, error: null };
};

export const deleteGalleryItemFromDb = async (
  itemId: string,
  storagePath?: string
): Promise<{ error: any }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || null;
  if (!userId) return { error: new Error('Not authenticated') };

  const deletedIds = readSharedStore<string[]>(SHARED_STORE_KEYS.deletedGalleryItems, []);
  if (!deletedIds.includes(itemId)) {
    writeSharedStore(SHARED_STORE_KEYS.deletedGalleryItems, [...deletedIds, itemId]);
  }
  const sharedGallery = readSharedStore<GalleryItem[]>(SHARED_STORE_KEYS.galleryItems, []);
  writeSharedStore(
    SHARED_STORE_KEYS.galleryItems,
    sharedGallery.filter((g) => g.id !== itemId)
  );

  if (storagePath && isStorageFilePath(storagePath)) {
    await removeFileFromAppStorage(storagePath);
  }

  const { error } = await supabase
    .from('gallery_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  return { error };
};

