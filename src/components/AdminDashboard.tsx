import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Order,
  OrderStatus,
  ScreenType,
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
import { supabase } from '../supabaseClient';
import {
  fetchOrders,
  updateOrderStatusInDb,
  updateOrderAmountInDb,
  deleteOrderFromDb,
  resolveIsAdminFromSupabase,
  fetchAllLoggedInUsersFromSupabase,
  fetchSavedUserProfilesFromSupabase,
  deleteSavedUserProfileFromAdmin,
  fetchCakeProducts,
  insertCakeProductInDb,
  updateCakeProductInDb,
  deleteCakeProductFromDb,
  fetchGalleryItems,
  createGalleryItemInDb,
  updateGalleryItemInDb,
  deleteGalleryItemFromDb,
  fetchGallerySectionSettings,
  saveGallerySectionSettings,
  fetchCustomCakeSettings,
  saveCustomCakeSettings,
  DEFAULT_CUSTOM_CAKE_SETTINGS,
  fetchCustomCakes,
  updateCustomCakeInDb,
  deleteCustomCakeFromDb,
  CustomCakeRecord,
  updateUserRoleInSupabase,
  isAdminEmail,
  ADMIN_EMAILS,
  PRIMARY_OWNER_ADMIN_EMAIL,
} from '../services/supabaseData';

interface AdminDashboardProps {
  onNavigate: (screen: ScreenType) => void;
  onOpenNewCustomOrder: () => void;
  onLogout?: () => void;
  cakes?: CakeProduct[];
  onCakesChange?: (cakes: CakeProduct[]) => void;
  galleryItems?: GalleryItem[];
  onGalleryItemsChange?: (items: GalleryItem[]) => void;
  gallerySettings?: GallerySectionSettings;
  onGallerySettingsChange?: (settings: GallerySectionSettings) => void;
  customCakeSettings?: CustomCakeBuilderSettings;
  onCustomCakeSettingsChange?: (settings: CustomCakeBuilderSettings) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenNewCustomOrder,
  onLogout,
  cakes: propCakes,
  onCakesChange,
  galleryItems: propGalleryItems,
  onGalleryItemsChange,
  gallerySettings: propGallerySettings,
  onGallerySettingsChange,
  customCakeSettings: propCustomSettings,
  onCustomCakeSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    'Dashboard' | 'Orders' | 'Products' | 'Gallery' | 'Customers' | 'Settings' | 'Statistics'
  >('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoadedSupabaseOrders, setHasLoadedSupabaseOrders] = useState(false);
  const [loggedInUsers, setLoggedInUsers] = useState<LoggedInUserRecord[]>([]);
  const [catalogCakes, setCatalogCakes] = useState<CakeProduct[]>(
    propCakes && propCakes.length > 0 ? propCakes : SIGNATURE_CAKES
  );
  const [galleryList, setGalleryList] = useState<GalleryItem[]>(
    propGalleryItems && propGalleryItems.length > 0 ? propGalleryItems : INITIAL_GALLERY_ITEMS
  );
  const [galleryHeader, setGalleryHeader] = useState<GallerySectionSettings>(
    propGallerySettings || DEFAULT_GALLERY_SECTION_SETTINGS
  );
  const [savedProfiles, setSavedProfiles] = useState<SavedUserProfileRecord[]>([]);
  const [customCakesList, setCustomCakesList] = useState<CustomCakeRecord[]>([]);
  const [builderSettings, setBuilderSettings] = useState<CustomCakeBuilderSettings>(
    propCustomSettings || DEFAULT_CUSTOM_CAKE_SETTINGS
  );

  // Status banner
  const [adminToast, setAdminToast] = useState<string | null>(null);
  const [isRefreshingSupabase, setIsRefreshingSupabase] = useState(false);

  // Product Insert & Update Form State
  const [newCakeName, setNewCakeName] = useState('');
  const [newCakeCaption, setNewCakeCaption] = useState('Best Seller');
  const [newCakePrice, setNewCakePrice] = useState('999');
  const [newCakeRating, setNewCakeRating] = useState('4.9');
  const [newCakeReviewsCount, setNewCakeReviewsCount] = useState('45');
  const [newCakeCategory, setNewCakeCategory] = useState<CakeProduct['category']>('Chocolate');
  const [newCakeDescription, setNewCakeDescription] = useState('');
  const [newCakeIngredients, setNewCakeIngredients] = useState('');
  const [newCakeServings, setNewCakeServings] = useState('8 - 10 Servings');
  const [newCakeImageUrl, setNewCakeImageUrl] = useState('');
  const [newCakeImageFile, setNewCakeImageFile] = useState<File | null>(null);
  const [newCakeImagePreview, setNewCakeImagePreview] = useState<string>('');
  const [isInsertingProduct, setIsInsertingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductDraft, setEditingProductDraft] = useState<{
    name: string;
    caption: string;
    price: number;
    rating: number;
    description: string;
  }>({ name: '', caption: '', price: 899, rating: 4.8, description: '' });

  // Inspiration Gallery Admin State (Create, Upload Cake Image, Update, Delete)
  const [isSavingGalleryHeader, setIsSavingGalleryHeader] = useState(false);
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGallerySubHeading, setNewGallerySubHeading] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState('BESPOKE ROYAL');
  const [newGalleryDescription, setNewGalleryDescription] = useState('');
  const [newGalleryServings, setNewGalleryServings] = useState('10 - 14 Servings');
  const [newGalleryLeadTime, setNewGalleryLeadTime] = useState('24 Hours Notice');
  const [newGalleryRow, setNewGalleryRow] = useState<1 | 2>(1);
  const [newGalleryImageUrl, setNewGalleryImageUrl] = useState('');
  const [newGalleryImageFile, setNewGalleryImageFile] = useState<File | null>(null);
  const [newGalleryImagePreview, setNewGalleryImagePreview] = useState('');
  const [isInsertingGalleryItem, setIsInsertingGalleryItem] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editingGalleryDraft, setEditingGalleryDraft] = useState<{
    title: string;
    subHeading: string;
    category: string;
    description: string;
    imageUrl: string;
    servings: string;
    leadTime: string;
    rowNumber: 1 | 2;
  }>({
    title: '',
    subHeading: '',
    category: 'BESPOKE ROYAL',
    description: '',
    imageUrl: '',
    servings: '10 - 14 Servings',
    leadTime: '24 Hours Notice',
    rowNumber: 1,
  });
  const [editingGalleryFile, setEditingGalleryFile] = useState<File | null>(null);
  const [editingGalleryPreview, setEditingGalleryPreview] = useState('');
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);

  // Custom Cake Builder Editor State
  const [newFlavorInput, setNewFlavorInput] = useState('');
  const [newFillingInput, setNewFillingInput] = useState('');
  const [newFinishInput, setNewFinishInput] = useState('');
  const [newAccentInput, setNewAccentInput] = useState('');
  const [isSavingCustomSettings, setIsSavingCustomSettings] = useState(false);
  const [editingCustomCakeId, setEditingCustomCakeId] = useState<string | null>(null);
  const [editingCustomCakeDraft, setEditingCustomCakeDraft] = useState<Partial<CustomCakeRecord>>({});

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([
    `Shared Supabase Admin privileges active for ${ADMIN_EMAILS.join(' & ')}.`,
    'Orders, Logins, Insert/Delete Items & Custom Cakes synced across all Admin accounts.',
    'All private uploads connected to "app-files" bucket.',
  ]);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [activeAdminEmail, setActiveAdminEmail] = useState<string>(ADMIN_EMAILS[0]);
  const [editingOrderPriceId, setEditingOrderPriceId] = useState<string | null>(null);
  const [editingOrderPriceValue, setEditingOrderPriceValue] = useState<string>('');
  const [isSavingOrderPrice, setIsSavingOrderPrice] = useState<string | null>(null);

  // Dashboard Overview timeframe filter & menu dropdown state
  const [timeframeFilter, setTimeframeFilter] = useState<
    'All Time' | 'Today' | 'Yesterday' | 'This Week' | 'This Month'
  >('All Time');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [selectedStatDay, setSelectedStatDay] = useState<string>('All');

  // Logged-In Users table horizontal scroll & drawer state
  const usersTableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableScrollPercent, setTableScrollPercent] = useState<number>(0);
  const [selectedUserDrawer, setSelectedUserDrawer] = useState<LoggedInUserRecord | null>(null);

  const navigateToTab = (
    tab: 'Dashboard' | 'Orders' | 'Products' | 'Gallery' | 'Customers' | 'Settings' | 'Statistics'
  ) => {
    setActiveTab(tab);
    setShowDashboardMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUsersTableScroll = () => {
    const el = usersTableScrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setTableScrollPercent(0);
      return;
    }
    setTableScrollPercent(Math.round((el.scrollLeft / maxScroll) * 100));
  };

  const scrollUsersTableBy = (delta: number) => {
    const el = usersTableScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const showFeedback = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => {
      setAdminToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    if (propCakes && propCakes.length > 0) {
      setCatalogCakes(propCakes);
    }
  }, [propCakes]);

  useEffect(() => {
    if (propGalleryItems && propGalleryItems.length > 0) {
      setGalleryList(propGalleryItems);
    }
  }, [propGalleryItems]);

  useEffect(() => {
    if (propGallerySettings) {
      setGalleryHeader(propGallerySettings);
    }
  }, [propGallerySettings]);

  useEffect(() => {
    if (propCustomSettings) {
      setBuilderSettings(propCustomSettings);
    }
  }, [propCustomSettings]);

  const loadAllSupabaseAdminData = async () => {
    setIsRefreshingSupabase(true);
    try {
      const [
        ordersRes,
        usersRes,
        savedProfilesRes,
        productsRes,
        galleryRes,
        loadedGalleryHeader,
        customCakesRes,
        loadedSettings,
      ] = await Promise.all([
        fetchOrders(),
        fetchAllLoggedInUsersFromSupabase(),
        fetchSavedUserProfilesFromSupabase(),
        fetchCakeProducts(),
        fetchGalleryItems(),
        fetchGallerySectionSettings(),
        fetchCustomCakes(),
        fetchCustomCakeSettings(),
      ]);

      if (ordersRes.data) {
        setOrders(ordersRes.data);
        setHasLoadedSupabaseOrders(true);
      }

      if (usersRes.data) {
        setLoggedInUsers(usersRes.data);
      }

      if (savedProfilesRes.data) {
        setSavedProfiles(savedProfilesRes.data);
      }

      if (productsRes.data && productsRes.data.length > 0) {
        setCatalogCakes(productsRes.data);
        onCakesChange?.(productsRes.data);
      }

      if (galleryRes.data && galleryRes.data.length > 0) {
        setGalleryList(galleryRes.data);
        onGalleryItemsChange?.(galleryRes.data);
      }

      if (loadedGalleryHeader) {
        setGalleryHeader(loadedGalleryHeader);
        onGallerySettingsChange?.(loadedGalleryHeader);
      }

      if (customCakesRes.data) {
        setCustomCakesList(customCakesRes.data);
      }

      if (loadedSettings) {
        setBuilderSettings(loadedSettings);
        onCustomCakeSettingsChange?.(loadedSettings);
      }
    } finally {
      setIsRefreshingSupabase(false);
    }
  };

  // Protect private pages with supabase.auth.getSession() and load Supabase data
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.history.replaceState(null, '', '/login');
        onNavigate('signin');
        return;
      }

      const isAdmin = await resolveIsAdminFromSupabase(session.user);
      if (!isAdmin) {
        window.history.replaceState(null, '', '/profile');
        onNavigate('profile');
        return;
      }

      if (session.user.email) {
        setActiveAdminEmail(session.user.email);
      }

      await loadAllSupabaseAdminData();
    };
    verifySessionAndLoadData();
  }, [onNavigate]);

  // ==========================================================================
  // ==========================================================================
  // 1. SUPABASE METRICS CALCULATIONS (Total Revenue Up Till Now & By Timeframe Filter)
  // ==========================================================================
  const allTimeRevenue = useMemo(() => {
    return orders.reduce((acc, ord) => acc + (Number(ord.amount) || 0), 0);
  }, [orders]);

  const timeframeOrders = useMemo(() => {
    if (timeframeFilter === 'All Time') {
      return orders;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
      0
    );
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    return orders.filter((ord) => {
      let ordDate: Date | null = null;
      if (ord.createdAt) {
        const d = new Date(ord.createdAt);
        if (!isNaN(d.getTime())) ordDate = d;
      }
      if (!ordDate && ord.date && ord.date !== '—') {
        const d = new Date(ord.date);
        if (!isNaN(d.getTime())) ordDate = d;
      }
      if (!ordDate) return false;

      if (timeframeFilter === 'Today') {
        return ordDate >= todayStart && ordDate < tomorrowStart;
      }
      if (timeframeFilter === 'Yesterday') {
        return ordDate >= yesterdayStart && ordDate < todayStart;
      }
      if (timeframeFilter === 'This Week') {
        return ordDate >= weekStart && ordDate < tomorrowStart;
      }
      if (timeframeFilter === 'This Month') {
        return ordDate >= monthStart && ordDate < tomorrowStart;
      }
      return true;
    });
  }, [orders, timeframeFilter]);

  const totalRevenue = useMemo(() => {
    return timeframeOrders.reduce((acc, ord) => acc + (Number(ord.amount) || 0), 0);
  }, [timeframeOrders]);

  const totalOrdersCount = timeframeOrders.length;

  const customerSatisfaction = useMemo(() => {
    if (!catalogCakes || catalogCakes.length === 0) return { avg: '4.92', totalReviews: 328 };
    const sumRatings = catalogCakes.reduce((acc, c) => acc + (Number(c.rating) || 4.8), 0);
    const totalReviews = catalogCakes.reduce((acc, c) => acc + (Number(c.reviewsCount) || 50), 0);
    const avg = (sumRatings / catalogCakes.length).toFixed(2);
    return { avg, totalReviews };
  }, [catalogCakes]);

  const inOvenCount = useMemo(() => {
    return timeframeOrders.filter(
      (o) => o.status === 'Baking' || o.status === 'Pending'
    ).length;
  }, [timeframeOrders]);

  const activeRevenueView = useMemo(() => {
    const labelMap: Record<typeof timeframeFilter, string> = {
      'All Time': 'TOTAL UP TILL NOW',
      Today: 'EARNED TODAY',
      Yesterday: 'YESTERDAY REVENUE',
      'This Week': 'THIS WEEK REVENUE',
      'This Month': 'THIS MONTH REVENUE',
    };

    let percent = 72;
    if (totalRevenue > 0) {
      if (timeframeFilter === 'All Time') {
        percent = 78;
      } else {
        percent = Math.min(
          92,
          Math.max(65, Math.round((totalRevenue / Math.max(1, allTimeRevenue)) * 100))
        );
      }
    } else {
      percent = 0;
    }

    return {
      label: labelMap[timeframeFilter],
      amount: totalRevenue,
      percent,
    };
  }, [totalRevenue, allTimeRevenue, timeframeFilter]);

  const TIMEFRAME_CYCLE_ORDER: Array<typeof timeframeFilter> = [
    'All Time',
    'Today',
    'Yesterday',
    'This Week',
    'This Month',
  ];

  const handleCycleTimeframe = () => {
    const currentIndex = TIMEFRAME_CYCLE_ORDER.indexOf(timeframeFilter);
    const nextIndex = (currentIndex + 1) % TIMEFRAME_CYCLE_ORDER.length;
    setTimeframeFilter(TIMEFRAME_CYCLE_ORDER[nextIndex]);
  };

  // Filtered orders for Order History
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'All Statuses' || order.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch =
        !q ||
        order.customer.toLowerCase().includes(q) ||
        (order.customerEmail || '').toLowerCase().includes(q) ||
        (order.customerPhone || '').toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.cakeItem.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // Filtered logged-in users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return loggedInUsers;
    return loggedInUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [loggedInUsers, searchQuery]);

  // Day-wise user login statistics (100% Real Data from Supabase profiles, auth sessions & orders)
  const dayWiseLoginStats = useMemo(() => {
    const dayDefinitions = [
      { short: 'Mon', full: 'Monday', jsDay: 1 },
      { short: 'Tue', full: 'Tuesday', jsDay: 2 },
      { short: 'Wed', full: 'Wednesday', jsDay: 3 },
      { short: 'Thu', full: 'Thursday', jsDay: 4 },
      { short: 'Fri', full: 'Friday', jsDay: 5 },
      { short: 'Sat', full: 'Saturday', jsDay: 6 },
      { short: 'Sun', full: 'Sunday', jsDay: 0 },
    ];

    // Calculate current week dates for Mon - Sun
    const now = new Date();
    const currentJsDay = now.getDay();
    const diffToMonday = currentJsDay === 0 ? -6 : 1 - currentJsDay;
    const mondayOfThisWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday,
      0,
      0,
      0,
      0
    );

    const weekDayDates: Record<string, string> = {};
    dayDefinitions.forEach((d, idx) => {
      const dt = new Date(mondayOfThisWeek);
      dt.setDate(mondayOfThisWeek.getDate() + idx);
      weekDayDates[d.short] = dt.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
    });

    const usersByDayShort: Record<string, LoggedInUserRecord[]> = {
      Mon: [],
      Tue: [],
      Wed: [],
      Thu: [],
      Fri: [],
      Sat: [],
      Sun: [],
    };

    const ordersByDayShort: Record<string, number> = {
      Mon: 0,
      Tue: 0,
      Wed: 0,
      Thu: 0,
      Fri: 0,
      Sat: 0,
      Sun: 0,
    };

    const dateGroupsMap = new Map<
      string,
      {
        dateKey: string;
        label: string;
        dayName: string;
        count: number;
        users: LoggedInUserRecord[];
      }
    >();

    let loginsThisWeekCount = 0;
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);

    loggedInUsers.forEach((user) => {
      const parsed = user.lastLoginAt ? new Date(user.lastLoginAt) : new Date();
      const validDate = !isNaN(parsed.getTime()) ? parsed : new Date();
      if (validDate >= sevenDaysAgo) {
        loginsThisWeekCount += 1;
      }
      const jsDay = validDate.getDay();
      const matchedDay = dayDefinitions.find((d) => d.jsDay === jsDay) || dayDefinitions[0];
      usersByDayShort[matchedDay.short].push(user);

      const yyyy = validDate.getFullYear();
      const mm = String(validDate.getMonth() + 1).padStart(2, '0');
      const dd = String(validDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const formattedLabel = validDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const existing = dateGroupsMap.get(dateKey);
      if (existing) {
        existing.count += 1;
        existing.users.push(user);
      } else {
        dateGroupsMap.set(dateKey, {
          dateKey,
          label: formattedLabel,
          dayName: matchedDay.full,
          count: 1,
          users: [user],
        });
      }
    });

    orders.forEach((ord) => {
      const rawDate = ord.createdAt || ord.date;
      if (!rawDate || rawDate === '—') return;
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) return;
      const matchedDay =
        dayDefinitions.find((d) => d.jsDay === parsed.getDay()) || dayDefinitions[0];
      ordersByDayShort[matchedDay.short] += 1;
    });

    const bars = dayDefinitions.map((d) => ({
      short: d.short,
      full: d.full,
      dateLabel: weekDayDates[d.short],
      count: usersByDayShort[d.short].length,
      orderCount: ordersByDayShort[d.short],
      users: usersByDayShort[d.short],
    }));

    const totalActive = loggedInUsers.length;

    const maxBar = bars.reduce(
      (best, cur) => (cur.count > best.count ? cur : best),
      bars[0] || {
        short: 'Mon',
        full: 'Monday',
        dateLabel: '',
        count: 0,
        orderCount: 0,
        users: [],
      }
    );

    const activeDaysCount = Math.max(1, bars.filter((b) => b.count > 0).length);
    const avgPerDay =
      totalActive > 0 ? Number((totalActive / activeDaysCount).toFixed(1)) : 0;

    const dateBreakdown = Array.from(dateGroupsMap.values()).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );

    const customerCount = loggedInUsers.filter((u) => u.role !== 'Admin').length;
    const adminCount = loggedInUsers.filter((u) => u.role === 'Admin').length;
    const customerPercent =
      loggedInUsers.length > 0
        ? Math.round((customerCount / loggedInUsers.length) * 100)
        : 0;

    const activeWeekPercent =
      totalActive > 0 ? Math.round((loginsThisWeekCount / totalActive) * 100) : 0;

    return {
      bars,
      totalActive,
      peakDayFull: maxBar.count > 0 ? maxBar.full : 'No Logins Yet',
      peakDayShort: maxBar.short,
      peakCount: maxBar.count,
      avgPerDay,
      activeDaysCount,
      dateBreakdown,
      usersByDayShort,
      customerCount,
      adminCount,
      customerPercent,
      activeWeekPercent,
      loginsThisWeekCount,
    };
  }, [loggedInUsers, orders]);

  // Filtered saved user profiles
  const filteredSavedProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return savedProfiles;
    return savedProfiles.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.dietaryNotes.toLowerCase().includes(q)
    );
  }, [savedProfiles, searchQuery]);

  // ==========================================================================
  // HANDLERS: ADMIN ROLE MANAGEMENT
  // ==========================================================================
  const handleToggleUserAdminRole = async (userRecord: LoggedInUserRecord) => {
    const targetRole: 'Admin' | 'Customer' =
      userRecord.role === 'Admin' ? 'Customer' : 'Admin';
    setIsUpdatingRole(userRecord.id);
    try {
      const { error } = await updateUserRoleInSupabase({
        userId: userRecord.id,
        email: userRecord.email,
        role: targetRole,
      });
      if (error) {
        showFeedback(error.message || 'Could not update user role in Supabase.');
        return;
      }
      setLoggedInUsers((prev) =>
        prev.map((u) => (u.id === userRecord.id ? { ...u, role: targetRole } : u))
      );
      showFeedback(
        `${userRecord.email} is now set to ${targetRole} in Supabase.`
      );
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleAddAdminByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newAdminEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showFeedback('Please enter a valid email address.');
      return;
    }
    setIsUpdatingRole(cleanEmail);
    try {
      const { error } = await updateUserRoleInSupabase({
        email: cleanEmail,
        role: 'Admin',
      });
      if (error) {
        showFeedback(error.message || 'Could not update role in Supabase.');
        return;
      }
      setLoggedInUsers((prev) => {
        const exists = prev.some((u) => u.email.trim().toLowerCase() === cleanEmail);
        if (exists) {
          return prev.map((u) =>
            u.email.trim().toLowerCase() === cleanEmail ? { ...u, role: 'Admin' } : u
          );
        }
        return [
          {
            id: `admin-${cleanEmail.split('@')[0]}`,
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            phone: '—',
            role: 'Admin',
            city: '—',
            lastLoginAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
      setNewAdminEmailInput('');
      showFeedback(`${cleanEmail} has been granted Admin privileges!`);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveAdminByEmail = async () => {
    const cleanEmail = newAdminEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showFeedback('Please enter the admin email address you want to remove.');
      return;
    }
    setIsUpdatingRole(cleanEmail);
    try {
      const { error } = await updateUserRoleInSupabase({
        email: cleanEmail,
        role: 'Customer',
      });
      if (error) {
        showFeedback(error.message || 'Could not remove admin role.');
        return;
      }
      setLoggedInUsers((prev) =>
        prev.map((u) =>
          u.email.trim().toLowerCase() === cleanEmail ? { ...u, role: 'Customer' } : u
        )
      );
      setNewAdminEmailInput('');
      showFeedback(`${cleanEmail} has been removed from Admin and set to Customer.`);
    } finally {
      setIsUpdatingRole(null);
    }
  };

  // ==========================================================================
  // HANDLERS: ORDERS (Status Update & Custom Cake Price Edit)
  // ==========================================================================
  const handleSetOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const targetOrder = orders.find((ord) => ord.id === orderId);
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
    const { emailResult } = await updateOrderStatusInDb(orderId, newStatus, targetOrder);
    if (newStatus === 'Ready') {
      if (emailResult?.sent) {
        showFeedback(
          `Order ${orderId} is Ready! Email automatically sent to ${emailResult.recipient} via ${emailResult.provider || 'Gmail (EmailJS)'}.`
        );
      } else if (emailResult?.recipient) {
        showFeedback(
          `Order ${orderId} marked Ready (Email notice for ${emailResult.recipient}: ${emailResult.error || 'Pending'}).`
        );
      } else {
        showFeedback(
          `Order ${orderId} status updated to Ready (no customer email on file to notify).`
        );
      }
    } else {
      showFeedback(
        `Order ${orderId} status updated to ${newStatus} (synced with User Profile).`
      );
    }
  };

  const handleCycleStatus = async (orderId: string, currentOrderStatus?: OrderStatus) => {
    const currentOrder = orders.find((ord) => ord.id === orderId);
    const rawStatus = String(currentOrderStatus || currentOrder?.status || 'Pending').trim();
    const nextStatus: OrderStatus =
      rawStatus === 'Pending'
        ? 'Baking'
        : rawStatus === 'Baking'
        ? 'Ready'
        : 'Pending';

    await handleSetOrderStatus(orderId, nextStatus);
  };

  const handleStartEditOrderPrice = (ord: Order) => {
    setEditingOrderPriceId(ord.id);
    setEditingOrderPriceValue(
      Number(ord.amount) > 0 ? String(Number(ord.amount)) : ''
    );
  };

  const handleSaveOrderPrice = async (orderId: string) => {
    const cleaned = editingOrderPriceValue.replace(/[^0-9.]/g, '');
    const parsedPrice = cleaned === '' ? 0 : Math.max(0, Number(Number(cleaned).toFixed(2)));
    if (isNaN(parsedPrice)) {
      showFeedback('Please enter a valid price in ₹.');
      return;
    }

    setIsSavingOrderPrice(orderId);
    try {
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, amount: parsedPrice } : ord))
      );
      setEditingOrderPriceId(null);
      await updateOrderAmountInDb(orderId, parsedPrice);
      showFeedback(
        `Order ${orderId} price updated to ₹${parsedPrice.toLocaleString('en-IN')} and reflected in Dashboard revenue!`
      );
    } finally {
      setIsSavingOrderPrice(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    await deleteOrderFromDb(orderId);
    showFeedback(`Order ${orderId} removed from history.`);
  };

  // ==========================================================================
  // HANDLERS: PRODUCTS INSERT & DELETE
  // ==========================================================================
  const handleProductImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewCakeImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setNewCakeImagePreview(objectUrl);
  };

  const handleInsertProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCakeName.trim()) {
      showFeedback('Please enter a product name.');
      return;
    }
    if (!newCakePrice || Number(newCakePrice) <= 0) {
      showFeedback('Please enter a valid price in Rs (₹).');
      return;
    }

    setIsInsertingProduct(true);
    try {
      const { data: created, error } = await insertCakeProductInDb(
        {
          name: newCakeName,
          caption: newCakeCaption,
          price: Number(newCakePrice),
          rating: Number(newCakeRating) || 4.8,
          reviewsCount: Number(newCakeReviewsCount) || 25,
          category: newCakeCategory,
          description:
            newCakeDescription ||
            `Handcrafted ${newCakeName} prepared fresh with signature patisserie ingredients.`,
          imageUrl: newCakeImageUrl,
          ingredients: newCakeIngredients,
          servings: newCakeServings,
        },
        newCakeImageFile
      );

      if (error || !created) {
        showFeedback(`Error adding item: ${error?.message || 'Could not insert item'}`);
        return;
      }

      const updatedCatalog = [created, ...catalogCakes.filter((c) => c.id !== created.id)];
      setCatalogCakes(updatedCatalog);
      onCakesChange?.(updatedCatalog);

      // Reset form
      setNewCakeName('');
      setNewCakeCaption('Chef Special');
      setNewCakePrice('999');
      setNewCakeRating('4.9');
      setNewCakeReviewsCount('50');
      setNewCakeDescription('');
      setNewCakeIngredients('');
      setNewCakeImageUrl('');
      setNewCakeImageFile(null);
      setNewCakeImagePreview('');

      showFeedback(`"${created.name}" inserted into Storefront & Supabase!`);
    } finally {
      setIsInsertingProduct(false);
    }
  };

  const handleStartEditProduct = (cake: CakeProduct) => {
    setEditingProductId(cake.id);
    setEditingProductDraft({
      name: cake.name,
      caption: cake.caption || cake.tags?.[1] || cake.category || 'Signature Cake',
      price: cake.price,
      rating: cake.rating ?? 4.8,
      description: cake.description,
    });
  };

  const handleSaveUpdateProduct = async (cakeId: string) => {
    const { data: updated, error } = await updateCakeProductInDb(cakeId, editingProductDraft);
    if (error || !updated) {
      showFeedback(`Error updating item: ${error?.message || 'Could not update item'}`);
      return;
    }
    const updatedCatalog = catalogCakes.map((c) => (c.id === cakeId ? updated : c));
    setCatalogCakes(updatedCatalog);
    onCakesChange?.(updatedCatalog);
    setEditingProductId(null);
    showFeedback(`"${updated.name}" updated in Supabase!`);
  };

  const handleDeleteProduct = async (cake: CakeProduct) => {
    setDeletingProductId(cake.id);
    try {
      await deleteCakeProductFromDb(cake.id, cake.storagePath);
      const updatedCatalog = catalogCakes.filter((c) => c.id !== cake.id);
      setCatalogCakes(updatedCatalog);
      onCakesChange?.(updatedCatalog);
      showFeedback(`"${cake.name}" deleted from catalog & storage.`);
    } finally {
      setDeletingProductId(null);
    }
  };

  // ==========================================================================
  // HANDLERS: INSPIRATION GALLERY CRUD & CAKE IMAGE UPLOAD
  // ==========================================================================
  const handleSaveGalleryHeaderAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGalleryHeader(true);
    try {
      const { data, error } = await saveGallerySectionSettings(galleryHeader);
      if (error) {
        showFeedback(`Error saving gallery header: ${error.message || 'Failed'}`);
        return;
      }
      setGalleryHeader(data);
      onGallerySettingsChange?.(data);
      showFeedback('Gallery section heading, sub-heading & description saved to Supabase!');
    } finally {
      setIsSavingGalleryHeader(false);
    }
  };

  const handleGalleryImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewGalleryImageFile(file);
    setNewGalleryImagePreview(URL.createObjectURL(file));
  };

  const handleInsertGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryTitle.trim() || !newGalleryDescription.trim()) {
      showFeedback('Please enter a gallery item heading and description.');
      return;
    }
    setIsInsertingGalleryItem(true);
    try {
      const { data: created, error } = await createGalleryItemInDb(
        {
          title: newGalleryTitle,
          subHeading: newGallerySubHeading,
          category: newGalleryCategory,
          description: newGalleryDescription,
          imageUrl: newGalleryImageUrl,
          servings: newGalleryServings,
          leadTime: newGalleryLeadTime,
          rowNumber: newGalleryRow,
          displayOrder: galleryList.length + 1,
        },
        newGalleryImageFile
      );

      if (error || !created) {
        showFeedback(`Error creating gallery item: ${error?.message || 'Could not insert'}`);
        return;
      }

      const nextList = [created, ...galleryList.filter((g) => g.id !== created.id)];
      setGalleryList(nextList);
      onGalleryItemsChange?.(nextList);

      setNewGalleryTitle('');
      setNewGallerySubHeading('');
      setNewGalleryDescription('');
      setNewGalleryImageUrl('');
      setNewGalleryImageFile(null);
      setNewGalleryImagePreview('');
      showFeedback(`"${created.title}" added to Inspiration Gallery in Supabase!`);
    } finally {
      setIsInsertingGalleryItem(false);
    }
  };

  const handleStartEditGalleryItem = (item: GalleryItem) => {
    setEditingGalleryId(item.id);
    setEditingGalleryDraft({
      title: item.title,
      subHeading: item.subHeading || '',
      category: item.category,
      description: item.description,
      imageUrl: item.image,
      servings: item.servings,
      leadTime: item.leadTime,
      rowNumber: item.rowNumber,
    });
    setEditingGalleryFile(null);
    setEditingGalleryPreview('');
  };

  const handleSaveUpdateGalleryItem = async (itemId: string) => {
    const { data: updated, error } = await updateGalleryItemInDb(
      itemId,
      editingGalleryDraft,
      editingGalleryFile
    );
    if (error || !updated) {
      showFeedback(`Error updating gallery item: ${error?.message || 'Failed'}`);
      return;
    }
    const nextList = galleryList.map((g) => (g.id === itemId ? updated : g));
    setGalleryList(nextList);
    onGalleryItemsChange?.(nextList);
    setEditingGalleryId(null);
    setEditingGalleryFile(null);
    setEditingGalleryPreview('');
    showFeedback(`Gallery item "${updated.title}" updated in Supabase!`);
  };

  const handleDeleteGalleryItem = async (item: GalleryItem) => {
    setDeletingGalleryId(item.id);
    try {
      await deleteGalleryItemFromDb(item.id, item.storagePath);
      const nextList = galleryList.filter((g) => g.id !== item.id);
      setGalleryList(nextList);
      onGalleryItemsChange?.(nextList);
      showFeedback(`"${item.title}" deleted from Supabase gallery & storage.`);
    } finally {
      setDeletingGalleryId(null);
    }
  };

  // ==========================================================================
  // HANDLERS: DESIGN CUSTOM CAKE DATA & PRICE UPDATES
  // ==========================================================================
  const handleTierChange = (
    tierCount: number,
    field: 'label' | 'guests' | 'price',
    value: string
  ) => {
    setBuilderSettings((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.count === tierCount
          ? {
              ...t,
              [field]: field === 'price' ? Math.max(0, Number(value) || 0) : value,
            }
          : t
      ),
    }));
  };

  const handleSaveBuilderSettings = async () => {
    setIsSavingCustomSettings(true);
    try {
      const { data } = await saveCustomCakeSettings(builderSettings);
      onCustomCakeSettingsChange?.(data);
      showFeedback('Design Custom Cake options & prices updated in Supabase!');
    } finally {
      setIsSavingCustomSettings(false);
    }
  };

  const handleStartEditCustomCakeRow = (row: CustomCakeRecord) => {
    setEditingCustomCakeId(row.id || null);
    setEditingCustomCakeDraft({
      tiers: row.tiers,
      sponge_flavor: row.sponge_flavor,
      filling: row.filling,
      exterior_finish: row.exterior_finish,
      inscription: row.inscription,
      estimated_price: row.estimated_price,
    });
  };

  const handleSaveCustomCakeRow = async (id: string) => {
    const { data, error } = await updateCustomCakeInDb(id, editingCustomCakeDraft);
    if (!error) {
      setCustomCakesList((prev) =>
        prev.map((item) =>
          item.id === id ? ({ ...item, ...editingCustomCakeDraft, ...(data || {}) } as CustomCakeRecord) : item
        )
      );
      setEditingCustomCakeId(null);
      showFeedback('Custom cake design & price updated in Supabase!');
    } else {
      showFeedback(`Failed to update custom cake: ${error.message || 'Error'}`);
    }
  };

  const handleDeleteCustomCakeRow = async (id: string) => {
    await deleteCustomCakeFromDb(id);
    setCustomCakesList((prev) => prev.filter((c) => c.id !== id));
    showFeedback('Custom cake record deleted from Supabase.');
  };

  const handleDeleteSavedProfile = async (profile: SavedUserProfileRecord) => {
    await deleteSavedUserProfileFromAdmin(profile.id, profile.email);
    setSavedProfiles((prev) => prev.filter((p) => p.id !== profile.id));
    showFeedback(`Removed saved profile record for ${profile.fullName}.`);
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col w-full max-w-full overflow-x-clip pt-[57px]">
      {/* Admin Feedback Toast */}
      {adminToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-5 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 border border-white/15">
          <span className="material-symbols-outlined text-base">verified</span>
          <span>{adminToast}</span>
        </div>
      )}

      {/* TopNavBar (Shell) matching reference screenshots - Fixed on scroll */}
      <header className="bg-white/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200/80 shadow-2xs">
        <div className="flex justify-between items-center px-3 sm:px-6 py-2.5 max-w-screen-2xl mx-auto w-full gap-2 sm:gap-3 bg-white/95">
          {/* Left: Back Arrow (when in sub-page) + CakeZone Brand + ADMIN PANEL pill */}
          <div className="flex items-center gap-2 sm:gap-5 min-w-0">
            {activeTab !== 'Dashboard' ? (
              <button
                type="button"
                onClick={() => navigateToTab('Dashboard')}
                className="w-9 h-9 rounded-full border-2 border-[#7c3aed]/40 flex items-center justify-center text-[#5b21b6] hover:bg-[#f5f3ff] transition-colors cursor-pointer shrink-0"
                title="Back to Dashboard Overview"
              >
                <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('storefront')}
                className="w-9 h-9 rounded-full border-2 border-[#7c3aed]/40 flex items-center justify-center text-[#5b21b6] hover:bg-[#f5f3ff] transition-colors cursor-pointer shrink-0"
                title="Return to Storefront"
              >
                <span className="material-symbols-outlined text-lg leading-none">arrow_back</span>
              </button>
            )}

            <div className="flex flex-col items-center justify-center leading-none">
              <button
                type="button"
                onClick={() => navigateToTab('Dashboard')}
                className="text-xl sm:text-2xl font-black text-[#4c1d95] tracking-tight font-headline cursor-pointer leading-none"
              >
                CakeZone
              </button>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#4c1d95] tracking-wide mt-0.5 leading-none">
                (Admin)
              </span>
            </div>

            <div className="hidden lg:flex items-center gap-2.5 bg-slate-100/90 px-3.5 py-1.5 rounded-full w-72 border border-slate-200/80">
              <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
              <input
                className="bg-transparent border-none text-xs font-medium focus:outline-none w-full text-slate-800 placeholder:text-slate-400"
                placeholder="Search orders, logged-in users, cakes..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Actions: Sync button, Notifications bell, Avatar badge, Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={loadAllSupabaseAdminData}
              disabled={isRefreshingSupabase}
              className="w-9 h-9 sm:w-auto sm:px-3.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-xs font-bold text-[#4c1d95] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              title="Sync live data from Supabase"
            >
              <span
                className={`material-symbols-outlined text-base ${
                  isRefreshingSupabase ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span className="hidden sm:inline">
                {isRefreshingSupabase ? 'Syncing...' : 'Sync'}
              </span>
            </button>


            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

            {/* Admin Initials Badge & Current Admin Email */}
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex flex-col items-end leading-tight">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Current Admin
                </span>
                <span className="text-xs font-bold text-slate-800">{activeAdminEmail}</span>
              </div>
              <div
                className="w-9 h-9 rounded-xl bg-[#4c1d95] text-white flex items-center justify-center font-black text-xs shadow-xs"
                title={`Current Admin: ${activeAdminEmail}`}
              >
                {activeAdminEmail.slice(0, 2).toUpperCase()}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all items-center gap-1 cursor-pointer"
                  title="Sign out of CakeZone"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Application Container */}
      <div className="flex-1 flex max-w-screen-2xl mx-auto w-full min-w-0 overflow-x-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 hidden md:flex flex-col py-6 px-4 gap-2 bg-white border-r border-slate-200/80 shrink-0">
          <nav className="flex flex-col gap-1.5 w-full">
            <button
              onClick={() => navigateToTab('Dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'Dashboard'
                  ? 'bg-[#7c3aed] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-lg">grid_view</span>
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => navigateToTab('Statistics')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                activeTab === 'Statistics'
                  ? 'bg-[#7c3aed] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">bar_chart</span>
                <span>Statistic</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'Statistics'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#ede9fe] text-[#5b21b6]'
                }`}
              >
                {loggedInUsers.length}
              </span>
            </button>
            <button
              onClick={() => navigateToTab('Customers')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                activeTab === 'Customers'
                  ? 'bg-[#4c1d95] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">group</span>
                <span>Logged in user</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'Customers'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#ede9fe] text-[#5b21b6]'
                }`}
              >
                {loggedInUsers.length}
              </span>
            </button>
            <button
              onClick={() => navigateToTab('Products')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                activeTab === 'Products'
                  ? 'bg-[#4c1d95] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                <span>Insert/delete cake item</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'Products'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {catalogCakes.length}
              </span>
            </button>
            <button
              onClick={() => navigateToTab('Gallery')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                activeTab === 'Gallery'
                  ? 'bg-[#4c1d95] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">photo_library</span>
                <span>Inspiration Gallery</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'Gallery'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {galleryList.length}
              </span>
            </button>
            <button
              onClick={() => navigateToTab('Orders')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                activeTab === 'Orders'
                  ? 'bg-[#4c1d95] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                <span>Order History</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'Orders'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => navigateToTab('Settings')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                activeTab === 'Settings'
                  ? 'bg-[#4c1d95] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">badge</span>
                <span>User saved Profiles</span>
              </div>
              <span
                className={`px-2 py-0.5 text-[11px] rounded-full font-extrabold ${
                  activeTab === 'Settings'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {savedProfiles.length}
              </span>
            </button>
          </nav>

          {/* Storefront Shortcut Card */}
          <div className="mt-auto p-4 rounded-2xl bg-[#f8f7fc] border border-slate-200/80 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
              <span className="material-symbols-outlined text-[#7c3aed]">storefront</span>
              <span>Live Storefront</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Changes to cake items and gallery designs immediately update the customer storefront.
            </p>
            <button
              onClick={() => onNavigate('storefront')}
              className="w-full py-2 rounded-xl bg-[#4c1d95] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              View Live Storefront →
            </button>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 flex flex-col gap-6 overflow-y-auto overflow-x-hidden bg-[#fbfaff]">
          {/* =================================================================
              1. DASHBOARD OVERVIEW PAGE (Matches Mobile Reference Structure)
          ================================================================== */}
          {activeTab === 'Dashboard' && (
            <div className="max-w-3xl mx-auto w-full min-w-0 flex flex-col gap-4 sm:gap-6">
              {/* Top Timeframe Header & Timeframe Filter Dropdown */}
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-[28px] sm:text-4xl font-black text-slate-900 tracking-tight font-headline leading-none">
                  {timeframeFilter}
                </h1>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTimeframeDropdown((prev) => !prev)}
                    className="px-3.5 py-1.5 rounded-full bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#6d28d9] text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{timeframeFilter}</span>
                    <span className="material-symbols-outlined text-base leading-none">
                      expand_more
                    </span>
                  </button>
                  {showTimeframeDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30">
                      {(
                        [
                          { value: 'All Time', label: 'All Time (Up Till Now)' },
                          { value: 'Today', label: 'Today' },
                          { value: 'Yesterday', label: 'Yesterday' },
                          { value: 'This Week', label: 'This Week' },
                          { value: 'This Month', label: 'This Month' },
                        ] as const
                      ).map((tf) => (
                        <button
                          key={tf.value}
                          type="button"
                          onClick={() => {
                            setTimeframeFilter(tf.value);
                            setShowTimeframeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                            timeframeFilter === tf.value
                              ? 'bg-[#f5f3ff] text-[#6d28d9]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{tf.label}</span>
                          {timeframeFilter === tf.value && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Overview / Menu Pill Button with Navigation Dropdown + Statistic Button beside it */}
              <div className="relative flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDashboardMenu((prev) => !prev)}
                  className="px-4 py-1.5 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">grid_view</span>
                  <span>Menu</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToTab('Statistics')}
                  className="px-4 py-1.5 rounded-full bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#6d28d9] border border-[#d8b4fe] text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">bar_chart</span>
                  <span>Statistic</span>
                </button>

                {showDashboardMenu && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-30 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => navigateToTab('Dashboard')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold bg-[#f5f3ff] text-[#6d28d9] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base">grid_view</span>
                        <span>Overview</span>
                      </span>
                      <span className="material-symbols-outlined text-sm">check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Statistics')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[#7c3aed]">
                          bar_chart
                        </span>
                        <span>Statistic (Day-Wise Logins)</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                        {loggedInUsers.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Customers')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[#7c3aed]">
                          group
                        </span>
                        <span>Logged in user</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                        {loggedInUsers.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Products')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[#7c3aed]">
                          shopping_bag
                        </span>
                        <span>Insert/delete cake item</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                        {catalogCakes.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Gallery')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[#7c3aed]">
                          photo_library
                        </span>
                        <span>Inspiration Gallery</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                        {galleryList.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Orders')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[#7c3aed]">
                          receipt_long
                        </span>
                        <span>Order History</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                        {orders.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Settings')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[#7c3aed]">
                          badge
                        </span>
                        <span>User saved Profiles</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                        {savedProfiles.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* HERO CARD: Total Revenue with Circular Ring & 3 Interactive Navigation Rows */}
              <div className="bg-white rounded-[28px] p-5 sm:p-8 shadow-sm border border-slate-100 flex flex-col gap-4 sm:gap-6 w-full min-w-0 overflow-hidden">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-headline leading-tight">
                      Total Revenue
                    </h2>
                    <p className="text-[11px] sm:text-sm text-slate-400 font-medium mt-1 leading-snug">
                      Target = Projected - Completed + In
                      <br className="sm:hidden" /> Oven
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCycleTimeframe}
                    className="px-3.5 py-1.5 rounded-2xl bg-[#faf5ff] hover:bg-[#f3e8ff] border border-[#f3e8ff] text-[#7c3aed] text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider leading-tight text-left shrink-0 cursor-pointer transition-colors"
                  >
                    TAP TO
                    <br />
                    CYCLE
                  </button>
                </div>

                {/* Ring Gauge (Left) + 3 Clickable Navigation Metrics (Right) - Side-by-Side on Mobile & Desktop */}
                <div className="grid grid-cols-12 items-center gap-2 sm:gap-4 py-1 sm:py-2 w-full min-w-0">
                  {/* Left Circular Progress Ring */}
                  <div className="col-span-6 sm:col-span-7 flex items-center justify-center select-none min-w-0">
                    <div className="relative w-[138px] h-[138px] sm:w-56 sm:h-56 max-w-full aspect-square flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                        <defs>
                          <linearGradient id="cakezoneRevGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="50%" stopColor="#9333ea" />
                            <stop offset="100%" stopColor="#6d28d9" />
                          </linearGradient>
                        </defs>
                        {/* Background Track */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#f3e8ff"
                          strokeWidth="16"
                        />
                        {/* Animated Value Ring */}
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="url(#cakezoneRevGrad)"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 80}
                          strokeDashoffset={
                            2 * Math.PI * 80 * (1 - activeRevenueView.percent / 100)
                          }
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 sm:px-5">
                        <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
                          ₹{activeRevenueView.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[8.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mt-1.5 leading-tight max-w-[96px] sm:max-w-[140px] break-words">
                          {activeRevenueView.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right 3 Interactive Metric Rows (Navigate to Dedicated Pages) */}
                  <div className="col-span-6 sm:col-span-5 flex flex-col gap-3 sm:gap-4 min-w-0 pl-1 sm:pl-0">
                    {/* 1. Logged in user -> navigates to Customers */}
                    <button
                      type="button"
                      onClick={() => navigateToTab('Customers')}
                      className="group flex items-center gap-2.5 sm:gap-3.5 p-1 sm:p-2 rounded-2xl hover:bg-[#f5f3ff] transition-all text-left cursor-pointer w-full min-w-0"
                    >
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#f3e8ff] text-[#7c3aed] group-hover:bg-[#7c3aed] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                        <span className="material-symbols-outlined text-base sm:text-xl">group</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400 group-hover:text-[#6d28d9] transition-colors leading-tight">
                          Logged in user
                        </p>
                        <p className="text-sm sm:text-lg font-black text-[#7c3aed] tabular-nums leading-tight mt-0.5">
                          {loggedInUsers.length}
                        </p>
                      </div>
                    </button>

                    {/* 2. Insert/Delete cake item -> navigates to Products */}
                    <button
                      type="button"
                      onClick={() => navigateToTab('Products')}
                      className="group flex items-center gap-2.5 sm:gap-3.5 p-1 sm:p-2 rounded-2xl hover:bg-[#f5f3ff] transition-all text-left cursor-pointer w-full min-w-0"
                    >
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#f3e8ff] text-[#7c3aed] group-hover:bg-[#7c3aed] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                        <span className="material-symbols-outlined text-base sm:text-xl">
                          shopping_basket
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400 group-hover:text-[#6d28d9] transition-colors leading-snug">
                          Insert/Delete
                          <br />
                          cake item
                        </p>
                        <p className="text-sm sm:text-lg font-black text-slate-900 tabular-nums leading-tight mt-0.5">
                          {catalogCakes.length}
                        </p>
                      </div>
                    </button>

                    {/* 3. Saved User profile -> navigates to Settings */}
                    <button
                      type="button"
                      onClick={() => navigateToTab('Settings')}
                      className="group flex items-center gap-2.5 sm:gap-3.5 p-1 sm:p-2 rounded-2xl hover:bg-[#fef3c7]/60 transition-all text-left cursor-pointer w-full min-w-0"
                    >
                      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#fef3c7] text-[#b45309] group-hover:bg-[#d97706] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                        <span className="material-symbols-outlined text-base sm:text-xl">
                          account_box
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-slate-400 group-hover:text-[#b45309] transition-colors leading-snug">
                          Saved User
                          <br />
                          profile
                        </p>
                        <p className="text-sm sm:text-lg font-black text-slate-900 tabular-nums leading-tight mt-0.5">
                          {savedProfiles.length}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bottom Pagination Dots matching reference screenshot */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  {(['All Time', 'Today', 'Yesterday', 'This Month'] as const).map((tf, idx) => {
                    const isActive =
                      timeframeFilter === tf ||
                      (timeframeFilter === 'This Week' && idx === 3);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setTimeframeFilter(tf)}
                        aria-label={`View ${tf} revenue`}
                        className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                          isActive ? 'bg-[#7c3aed]' : 'bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* MIDDLE TWO-COLUMN CARDS: Total Orders (Order History) & Satisfaction */}
              <div className="grid grid-cols-2 gap-3.5 sm:gap-5 min-w-0">
                {/* Left Card: Total Orders -> Navigates to Order History ('Orders') */}
                <div
                  onClick={() => navigateToTab('Orders')}
                  className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-sm border border-slate-100 hover:border-[#7c3aed]/40 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 sm:gap-4 cursor-pointer group min-w-0"
                >
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <h3 className="text-xs sm:text-lg font-black text-slate-900 group-hover:text-[#7c3aed] transition-colors truncate">
                      Total Orders
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToTab('Orders');
                      }}
                      className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-[#faf5ff] group-hover:bg-[#7c3aed] text-[#7c3aed] group-hover:text-white text-[10px] sm:text-xs font-extrabold transition-colors cursor-pointer shrink-0"
                    >
                      View
                    </button>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 my-0.5 sm:my-1 min-w-0">
                    <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <span className="material-symbols-outlined text-sm sm:text-lg">
                        trending_up
                      </span>
                    </div>
                    <span className="text-2xl sm:text-4xl font-black text-slate-900 tabular-nums truncate leading-none">
                      {totalOrdersCount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2.5 min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-slate-400 truncate">
                      Ready: {timeframeOrders.filter((o) => o.status === 'Ready').length} /{' '}
                      {totalOrdersCount} orders
                    </p>
                    <div className="w-full h-1.5 sm:h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 via-fuchsia-600 to-[#7c3aed]"
                        style={{
                          width: `${
                            totalOrdersCount === 0
                              ? 0
                              : Math.min(
                                  100,
                                  Math.max(
                                    15,
                                    Math.round(
                                      (timeframeOrders.filter((o) => o.status === 'Ready').length /
                                        Math.max(1, totalOrdersCount)) *
                                        100
                                    )
                                  )
                                )
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-0.5 min-w-0">
                      <p className="text-[10px] sm:text-xs font-extrabold text-rose-600 truncate">
                        {inOvenCount} In Oven / Prep
                      </p>
                      <span className="hidden sm:inline text-[11px] font-bold text-[#7c3aed] group-hover:underline shrink-0">
                        Order History →
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Satisfaction */}
                <div className="bg-white rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-2.5 sm:gap-4 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <h3 className="text-xs sm:text-lg font-black text-slate-900 truncate">
                      Satisfaction
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigateToTab('Products')}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#faf5ff] hover:bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center font-bold text-sm sm:text-lg transition-colors cursor-pointer shrink-0"
                      title="Manage product ratings"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2.5 my-0.5 sm:my-1 min-w-0">
                    <span className="text-amber-400 text-base sm:text-2xl leading-none shrink-0">
                      ★
                    </span>
                    <span className="text-xl sm:text-3xl font-black text-slate-900 tabular-nums truncate leading-none">
                      {customerSatisfaction.avg} ★
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-bold text-slate-800 min-w-0">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-emerald-500 text-emerald-600 flex items-center justify-center text-[9px] sm:text-[11px] font-black shrink-0">
                      ✓
                    </span>
                    <span className="truncate">{catalogCakes.length} Catalog Items</span>
                  </div>

                  <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] sm:text-xs min-w-0">
                    <span className="text-slate-400 font-medium truncate">Total reviews</span>
                    <span className="font-extrabold text-[#7c3aed] shrink-0">
                      {customerSatisfaction.totalReviews} reviews
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTTOM CARD: Inspiration Gallery -> Navigates to Inspiration Gallery ('Gallery') */}
              <div
                onClick={() => navigateToTab('Gallery')}
                className="bg-white rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 shadow-sm border border-slate-100 hover:border-[#7c3aed]/40 hover:shadow-md transition-all flex items-center justify-between gap-2 sm:gap-4 cursor-pointer group min-w-0"
              >
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                    <h3 className="text-xs sm:text-lg font-black text-slate-900 group-hover:text-[#7c3aed] transition-colors">
                      Inspiration Gallery
                    </h3>
                    <span className="px-2 sm:px-3 py-0.5 rounded-full bg-[#f3e8ff] text-[#7c3aed] text-[10px] sm:text-xs font-extrabold shrink-0">
                      {galleryList.length} Designs
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-sm text-slate-400 font-medium truncate sm:whitespace-normal">
                    Trending Bespoke Creations &amp; Moodboards
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToTab('Gallery');
                  }}
                  className="text-[11px] sm:text-sm font-extrabold text-[#7c3aed] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 sm:gap-1 shrink-0 cursor-pointer"
                >
                  <span>View All</span>
                  <span className="material-symbols-outlined text-sm sm:text-base">chevron_right</span>
                </button>
              </div>

              {/* CakeZone Admin Control Center Banner (Placed at Last) */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col gap-2 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-headline">
                    CakeZone Admin Control Center
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-[#e6f7f1] text-[#0f766e] text-xs font-extrabold tracking-tight">
                    Full Privileges Active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed break-words">
                  Unified Supabase data synced across Admin accounts:{' '}
                  <strong className="font-extrabold text-slate-800 break-all sm:break-normal">
                    {Array.from(
                      new Set([
                        ...ADMIN_EMAILS,
                        ...loggedInUsers
                          .filter((u) => u.role === 'Admin' && u.email)
                          .map((u) => u.email.toLowerCase()),
                      ])
                    ).join(' · ')}
                  </strong>
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 min-w-0">
                  <span className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-2xl sm:rounded-full bg-[#f3e8ff] border border-[#d8b4fe] text-[#5b21b6] text-xs font-extrabold max-w-full break-all">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                    <span>Current Logged-In Admin:</span>{' '}
                    <span className="underline">{activeAdminEmail}</span>
                  </span>
                </div>
              </div>
            </div>
          )}


          {/* =================================================================
              1B. STATISTIC PAGE (Matches Reference Structure 1:1)
          ================================================================== */}
          {activeTab === 'Statistics' && (
            <div className="max-w-3xl mx-auto w-full min-w-0 flex flex-col gap-4 sm:gap-6">
              {/* Top Timeframe Header & Timeframe Filter Dropdown */}
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-[28px] sm:text-4xl font-black text-slate-900 tracking-tight font-headline leading-none">
                  {timeframeFilter}
                </h1>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTimeframeDropdown((prev) => !prev)}
                    className="px-3.5 py-1.5 rounded-full bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#6d28d9] text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{timeframeFilter}</span>
                    <span className="material-symbols-outlined text-base leading-none">
                      expand_more
                    </span>
                  </button>
                  {showTimeframeDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30">
                      {(
                        [
                          { value: 'All Time', label: 'All Time (Up Till Now)' },
                          { value: 'Today', label: 'Today' },
                          { value: 'Yesterday', label: 'Yesterday' },
                          { value: 'This Week', label: 'This Week' },
                          { value: 'This Month', label: 'This Month' },
                        ] as const
                      ).map((tf) => (
                        <button
                          key={tf.value}
                          type="button"
                          onClick={() => {
                            setTimeframeFilter(tf.value);
                            setShowTimeframeDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                            timeframeFilter === tf.value
                              ? 'bg-[#f5f3ff] text-[#6d28d9]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{tf.label}</span>
                          {timeframeFilter === tf.value && (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Menu + Statistic Pill Row */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigateToTab('Dashboard')}
                  className="px-4 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    arrow_back
                  </span>
                  <span>Menu</span>
                </button>
                <button
                  type="button"
                  className="px-4 py-1.5 rounded-full bg-[#7c3aed] text-white border-2 border-slate-900 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs cursor-default"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">
                    bar_chart
                  </span>
                  <span>Statistic</span>
                </button>
              </div>

              {/* MAIN CHART CARD (Optimized for Mobile View & Low-RAM Phones) */}
              <div className="bg-white rounded-[22px] sm:rounded-[32px] p-3.5 sm:p-7 md:p-8 shadow-xs border border-slate-100 flex flex-col gap-4 sm:gap-6 w-full min-w-0">
                {/* Top Header Row */}
                <div className="flex items-start justify-between gap-2.5 min-w-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-[24px] md:text-[26px] font-black text-[#0f172a] tracking-tight leading-tight">
                      Weekly Visitor Traffic
                    </h2>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full bg-[#dcfce7] text-[#047857] text-[11px] sm:text-xs font-extrabold tracking-tight">
                        <span>↗</span>
                        <span>{dayWiseLoginStats.activeWeekPercent}% this week</span>
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs md:text-sm text-[#94a3b8] font-medium mt-1 leading-snug">
                      Mon – Sun Real User Logins &amp;
                      <br className="sm:hidden" /> Activity (Fetched from Supabase)
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl sm:text-[32px] font-black text-[#0f172a] tabular-nums leading-none">
                      {dayWiseLoginStats.totalActive.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[9px] sm:text-[10px] md:text-xs font-extrabold uppercase tracking-wider text-[#7c3aed] mt-1">
                      TOTAL ACTIVE
                    </div>
                  </div>
                </div>

                {/* Inner Lavender Chart Box */}
                <div className="bg-[#fcfaff] border border-[#f3e8ff] rounded-[18px] sm:rounded-[24px] p-2.5 sm:p-5 md:p-6 flex flex-col justify-between gap-4 sm:gap-6 min-w-0">
                  {/* Peak & Avg Pill Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
                      <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-[#7c3aed] shrink-0"></span>
                      <span className="text-[#64748b] font-medium">Peak:</span>
                      <span className="font-extrabold text-[#0f172a]">
                        {dayWiseLoginStats.peakDayFull} (
                        {dayWiseLoginStats.peakCount.toLocaleString('en-IN')})
                      </span>
                    </div>

                    <div className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full bg-white border border-[#e9d5ff] text-[#7c3aed] text-[10px] sm:text-xs font-extrabold shadow-2xs">
                      Avg {dayWiseLoginStats.avgPerDay}/day
                    </div>
                  </div>

                  {/* Real Day-Wise Bar Chart */}
                  <div className="pt-2 sm:pt-4 pb-1 px-0 sm:px-2 w-full min-w-0">
                    <div className="grid grid-cols-7 items-end gap-1 sm:gap-3 md:gap-4 h-40 sm:h-52 w-full">
                      {dayWiseLoginStats.bars.map((bar) => {
                        const maxVal = Math.max(1, dayWiseLoginStats.peakCount);
                        const heightPct =
                          bar.count === 0
                            ? 10
                            : Math.max(22, Math.round((bar.count / maxVal) * 100));
                        const isPeak =
                          bar.short === dayWiseLoginStats.peakDayShort && bar.count > 0;
                        const isSelected = selectedStatDay === bar.short;
                        const dateParts = (bar.dateLabel || '').split(' ');

                        const barStyleClass = isPeak
                          ? 'bg-gradient-to-b from-[#f43f5e] via-[#8b5cf6] to-[#581c87] ring-2 sm:ring-4 ring-[#f3e8ff] shadow-sm'
                          : bar.count > 0
                          ? 'bg-gradient-to-b from-[#9d4edd] to-[#6d28d9]'
                          : 'bg-[#d8b4fe]';

                        return (
                          <button
                            key={bar.short}
                            type="button"
                            onClick={() =>
                              setSelectedStatDay((prev) =>
                                prev === bar.short ? 'All' : bar.short
                              )
                            }
                            className="flex flex-col items-center justify-end h-full group cursor-pointer focus:outline-none touch-manipulation select-none py-0.5"
                            title={`${bar.full} (${bar.dateLabel}): ${bar.count} user login(s), ${bar.orderCount} order(s)`}
                          >
                            {/* Real Count Label Above Bar */}
                            <div
                              className={`text-[10px] sm:text-xs mb-1 sm:mb-2 tabular-nums flex items-center justify-center gap-0.5 leading-none ${
                                isPeak
                                  ? 'font-black text-[#4c1d95]'
                                  : bar.count > 0
                                  ? 'font-extrabold text-[#475569]'
                                  : 'font-bold text-[#94a3b8]'
                              }`}
                            >
                              {isPeak && (
                                <span className="text-amber-500 text-[10px] sm:text-[11px] leading-none">★</span>
                              )}
                              <span>{bar.count}</span>
                            </div>

                            {/* Vertical Rounded Bar (GPU accelerated) */}
                            <div className="w-full max-w-[28px] sm:max-w-[42px] flex items-end justify-center flex-1">
                              <div
                                className={`w-full rounded-t-[12px] sm:rounded-t-[18px] rounded-b-[3px] sm:rounded-b-[4px] transition-transform duration-200 transform-gpu ${barStyleClass} ${
                                  isSelected
                                    ? 'ring-2 ring-[#4c1d95] scale-[1.04]'
                                    : 'group-hover:opacity-90 active:scale-95'
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>

                            {/* Day Label + Stacked Date Below Bar */}
                            <span
                              className={`mt-1.5 sm:mt-2 text-[10px] sm:text-xs md:text-sm leading-none ${
                                isPeak || isSelected
                                  ? 'font-black text-[#4c1d95]'
                                  : 'font-bold text-[#64748b]'
                              }`}
                            >
                              {bar.short}
                            </span>
                            <span className="text-[8px] sm:text-[10px] font-semibold text-slate-400 mt-0.5 sm:mt-1 leading-tight text-center">
                              {dateParts[0] || ''}
                              <br />
                              {dateParts[1] || ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Stats Row inside Card (Real Supabase Values - Fully responsive without ellipsis cutoff) */}
                <div className="pt-3.5 sm:pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 sm:gap-6">
                  <div className="flex-1 flex items-center gap-3 p-2.5 sm:p-0 rounded-2xl bg-[#faf5ff] sm:bg-transparent border sm:border-0 border-[#f3e8ff] min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#f3e8ff] text-[#7c3aed] font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {dayWiseLoginStats.customerPercent}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider">
                        Customer Logins
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-[#1e293b] leading-tight mt-0.5">
                        {dayWiseLoginStats.customerCount} Customers · {dayWiseLoginStats.adminCount}{' '}
                        Admins
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center gap-3 p-2.5 sm:p-0 rounded-2xl bg-[#fffbeb] sm:bg-transparent border sm:border-0 border-[#fef3c7] min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#fef3c7] text-[#b45309] font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {orders.length}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] sm:text-xs font-semibold text-[#d97706] uppercase tracking-wider">
                        Total Orders &amp; Profiles
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-[#1e293b] leading-tight mt-0.5">
                        {orders.length} Orders · {savedProfiles.length} Profiles
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              2. LOGGED-IN USERS PAGE (Matches Image 2: Total People Logged In)
          ================================================================== */}
          {activeTab === 'Customers' && (
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-5">
              {/* Top Card: Total People Logged In + Add/Remove Admin Form */}
              <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#4c1d95] text-white flex items-center justify-center shadow-xs shrink-0">
                      <span className="material-symbols-outlined text-2xl">groups</span>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 font-headline leading-tight">
                        Total People Logged In
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Extracted from Supabase{' '}
                        <span className="underline decoration-[#7c3aed]/50 text-[#5b21b6] font-semibold">
                          profiles
                        </span>{' '}
                        &amp; sessions
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-2xl bg-[#4c1d95] text-white text-xs font-extrabold text-center leading-tight shrink-0 shadow-2xs">
                    <span className="block text-sm font-black tabular-nums">
                      {loggedInUsers.length}
                    </span>
                    <span>{loggedInUsers.length === 1 ? 'Person' : 'People'}</span>
                  </div>
                </div>

                {/* Email Input + Add Admin / Remove Admin Buttons */}
                <form onSubmit={handleAddAdminByEmail} className="flex flex-col gap-3 pt-1">
                  <div className="relative">
                    <span className="material-symbols-outlined text-slate-400 text-base absolute left-3.5 top-1/2 -translate-y-1/2">
                      mail
                    </span>
                    <input
                      type="email"
                      value={newAdminEmailInput}
                      onChange={(e) => setNewAdminEmailInput(e.target.value)}
                      placeholder="Enter email to Add or Remove Admin..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="submit"
                      disabled={Boolean(isUpdatingRole)}
                      className="py-3 px-4 rounded-xl bg-[#4c1d95] hover:bg-[#5b21b6] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">verified_user</span>
                      <span>Add Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAdminByEmail}
                      disabled={Boolean(isUpdatingRole)}
                      className="py-3 px-4 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">person_remove</span>
                      <span>Remove Admin</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* ACTIVE SESSIONS Card */}
              <div className="bg-white rounded-[24px] p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                      ACTIVE SESSIONS
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f3e8ff] text-[#6d28d9] text-[10px] font-extrabold">
                      Live Supabase RPC
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>WebSocket Live</span>
                  </span>
                </div>

                {/* Filter Search Input */}
                <div className="relative">
                  <span className="material-symbols-outlined text-slate-400 text-base absolute left-3.5 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter users by name, email, phone, city..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                  />
                </div>

                {/* Users Table */}
                <div
                  ref={usersTableScrollRef}
                  onScroll={handleUsersTableScroll}
                  className="overflow-x-auto rounded-xl border border-slate-100"
                >
                  <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-[#f8f7fc] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-3.5 w-10">#</th>
                        <th className="py-3 px-4">USER / NAME &amp; UID</th>
                        <th className="py-3 px-4">EMAIL ID</th>
                        <th className="py-3 px-4">PHONE NO.</th>
                        <th className="py-3 px-4">ROLE / ADMIN ACCESS</th>
                        <th className="py-3 px-4">CITY / ADDRESS</th>
                        <th className="py-3 px-4">LAST ACTIVE / LOGGED IN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                            No logged-in user records found.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u, index) => {
                          const dt = new Date(u.lastLoginAt || '');
                          const validDt = !isNaN(dt.getTime());
                          const formattedLoginDate = validDt
                            ? dt.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Today';
                          const formattedLoginTime = validDt
                            ? dt.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '';
                          const isRootOwner =
                            u.email.trim().toLowerCase() === PRIMARY_OWNER_ADMIN_EMAIL;
                          const isAdminUser = u.role === 'Admin';
                          const initials = (u.name || 'CZ')
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase();

                          return (
                            <tr
                              key={u.id}
                              onClick={() => setSelectedUserDrawer(u)}
                              className="hover:bg-[#f8f7fc] transition-colors cursor-pointer"
                            >
                              <td className="py-4 px-3.5 font-mono text-xs text-slate-400">
                                {index + 1}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  {u.avatarUrl ? (
                                    <img
                                      src={u.avatarUrl}
                                      alt={u.name}
                                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div
                                      className={`w-10 h-10 rounded-full font-extrabold text-xs flex items-center justify-center uppercase shrink-0 ${
                                        isAdminUser
                                          ? 'bg-[#4c1d95] text-white'
                                          : 'bg-[#ede9fe] text-[#5b21b6]'
                                      }`}
                                    >
                                      {initials}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-extrabold text-slate-900 leading-tight">
                                        {u.name}
                                      </p>
                                      {isAdminUser && (
                                        <span
                                          className="material-symbols-outlined text-[#6d28d9] text-sm"
                                          title="Verified Admin"
                                        >
                                          verified
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                      ID: {u.id.slice(0, 10)}...
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 font-mono text-xs sm:text-sm text-slate-700">
                                {u.email}
                              </td>
                              <td className="py-4 px-4 text-slate-600 tabular-nums">
                                {u.phone || '—'}
                              </td>
                              <td
                                className="py-4 px-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                      isAdminUser
                                        ? 'bg-[#4c1d95] text-white'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {u.role}
                                  </span>
                                  {!isRootOwner && u.email !== '—' && (
                                    <button
                                      type="button"
                                      disabled={isUpdatingRole === u.id}
                                      onClick={() => handleToggleUserAdminRole(u)}
                                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                                        isAdminUser
                                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                          : 'border-slate-200 hover:border-[#7c3aed] text-slate-600 hover:text-[#7c3aed]'
                                      }`}
                                    >
                                      {isUpdatingRole === u.id
                                        ? '...'
                                        : isAdminUser
                                        ? 'Remove Admin'
                                        : 'Make Admin'}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-slate-600">{u.city || '—'}</td>
                              <td className="py-4 px-4 text-xs text-slate-500 tabular-nums">
                                <span className="font-bold text-slate-800">
                                  {formattedLoginDate}
                                </span>
                                {formattedLoginTime && (
                                  <span className="block text-[11px] text-slate-400">
                                    {formattedLoginTime}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Horizontal Table Navigation Bar (Matches Image 2) */}
                <div className="bg-[#f8f7fc] rounded-2xl p-3.5 border border-slate-200/70 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#6d28d9]">
                        view_column
                      </span>
                      <span>Horizontal Table Navigation</span>
                    </span>
                    <span className="font-mono text-slate-400">
                      {tableScrollPercent}% Scrolled (Col 1 to 7)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => scrollUsersTableBy(-220)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shrink-0"
                      aria-label="Scroll table left"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-200/80 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-slate-400 transition-all duration-200"
                        style={{
                          width: `${Math.max(25, Math.min(100, 25 + tableScrollPercent * 0.75))}%`,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollUsersTableBy(220)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer shrink-0"
                      aria-label="Scroll table right"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Footer Status Line */}
                <div className="pt-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>
                      Showing {filteredUsers.length} of {loggedInUsers.length} Users
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Click any row to open Order &amp; Permissions Drawer
                  </p>
                </div>
              </div>

              {/* Selected User Order & Permissions Drawer Modal */}
              {selectedUserDrawer && (
                <div className="bg-white rounded-[24px] p-5 sm:p-6 border-2 border-[#7c3aed]/30 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#4c1d95] text-white font-black text-xs flex items-center justify-center uppercase">
                        {(selectedUserDrawer.name || 'CZ').slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          {selectedUserDrawer.name} — Permissions &amp; Session Details
                        </h4>
                        <p className="text-xs text-slate-500">{selectedUserDrawer.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUserDrawer(null)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">
                        User UID
                      </span>
                      <span className="font-mono text-slate-800 break-all">
                        {selectedUserDrawer.id}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">
                        Phone &amp; City
                      </span>
                      <span className="font-bold text-slate-800">
                        {selectedUserDrawer.phone || '—'} · {selectedUserDrawer.city || '—'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">
                          Current Role
                        </span>
                        <span className="font-black text-[#4c1d95]">
                          {selectedUserDrawer.role}
                        </span>
                      </div>
                      {selectedUserDrawer.email.trim().toLowerCase() !==
                        PRIMARY_OWNER_ADMIN_EMAIL && (
                        <button
                          type="button"
                          onClick={() => handleToggleUserAdminRole(selectedUserDrawer)}
                          className="px-3 py-1.5 rounded-lg bg-[#4c1d95] text-white font-bold text-xs cursor-pointer"
                        >
                          Toggle Role
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              3. INSERT & DELETE CAKE ITEM PAGE (Matches Image 3: Storefront Catalog Management)
          ================================================================== */}
          {activeTab === 'Products' && (
            <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
              {/* Page Heading matching Image 3 */}
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#5b21b6]">
                  STOREFRONT CATALOG MANAGEMENT
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline mt-0.5 leading-tight">
                  Insert &amp; Delete Cake Items ({catalogCakes.length} Active Items)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Add new cakes with caption, product image (uploaded to private bucket{' '}
                  <code className="font-mono text-[#6d28d9]">app-files</code> or URL), Rs price, rating, and description.
                </p>
              </div>

              {/* Insert New Cake Item Form Card (Matches Image 3) */}
              <form
                onSubmit={handleInsertProduct}
                className="bg-white rounded-[28px] p-5 sm:p-7 border border-slate-200/80 shadow-xs space-y-4"
              >
                <h3 className="text-sm sm:text-base font-extrabold text-[#4c1d95] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#f3e8ff] text-[#6d28d9] flex items-center justify-center text-sm font-black">
                    +
                  </span>
                  <span>Insert New Cake Item into Storefront</span>
                </h3>

                {/* Cake Name / Title */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    Cake Name / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCakeName}
                    onChange={(e) => setNewCakeName(e.target.value)}
                    placeholder="e.g. Belgian Hazelnut Praline"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                  />
                </div>

                {/* Caption / Highlight Tag */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    Caption / Highlight Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCakeCaption}
                    onChange={(e) => setNewCakeCaption(e.target.value)}
                    placeholder="Best Seller"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                  />
                </div>

                {/* 3-Column Row: Price, Rating, Reviews */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      Price (Rs / ₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newCakePrice}
                      onChange={(e) => setNewCakePrice(e.target.value)}
                      placeholder="999"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      Rating (★) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      required
                      value={newCakeRating}
                      onChange={(e) => setNewCakeRating(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      Reviews
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newCakeReviewsCount}
                      onChange={(e) => setNewCakeReviewsCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                    />
                  </div>
                </div>

                {/* 2-Column Row: Category & Servings / Weight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      Category
                    </label>
                    <select
                      value={newCakeCategory}
                      onChange={(e) =>
                        setNewCakeCategory(e.target.value as CakeProduct['category'])
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                    >
                      <option value="Chocolate">Chocolate</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Vanilla">Vanilla</option>
                      <option value="Red Velvet">Red Velvet</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                      Servings / Weight
                    </label>
                    <input
                      type="text"
                      value={newCakeServings}
                      onChange={(e) => setNewCakeServings(e.target.value)}
                      placeholder="8 - 10 Servings"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Key Ingredients */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    Key Ingredients
                  </label>
                  <input
                    type="text"
                    value={newCakeIngredients}
                    onChange={(e) => setNewCakeIngredients(e.target.value)}
                    placeholder="e.g. Belgian dark chocolate, French butter..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                  />
                </div>

                {/* Product Image Upload + URL */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-800">
                    Product Image (Upload to Supabase Storage &quot;app-files&quot; or Paste Image URL)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <label className="px-4 py-3 rounded-xl bg-[#4c1d95] hover:bg-[#5b21b6] text-white text-xs font-extrabold cursor-pointer transition-colors shrink-0 flex items-center justify-center gap-2 shadow-2xs">
                      <span className="material-symbols-outlined text-base">upload_file</span>
                      <span>Upload Product Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageSelect}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={newCakeImageUrl}
                      onChange={(e) => setNewCakeImageUrl(e.target.value)}
                      placeholder="Or paste image URL..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                    />
                  </div>
                  {(newCakeImagePreview || newCakeImageUrl) && (
                    <div className="flex items-center gap-3 pt-1">
                      <img
                        src={newCakeImagePreview || newCakeImageUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      />
                      <span className="text-[11px] text-emerald-700 font-bold">
                        {newCakeImageFile
                          ? `Ready to upload "${newCakeImageFile.name}" to app-files`
                          : 'Using provided image URL'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Description */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
                    Product Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newCakeDescription}
                    onChange={(e) => setNewCakeDescription(e.target.value)}
                    placeholder="Describe the flavor profile, sponge layers, ganache, and finishing..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/40 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isInsertingProduct}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#4c1d95] hover:bg-[#5b21b6] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                  <span>
                    {isInsertingProduct ? 'Uploading & Inserting...' : 'Insert Item into Catalog'}
                  </span>
                </button>
              </form>

              {/* Catalog Cake Items Stack / Cards matching Image 3 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 w-full min-w-0">
                {catalogCakes.map((cake) => {
                  const isEditingThis = editingProductId === cake.id;
                  return (
                    <div
                      key={cake.id}
                      className="bg-white rounded-2xl sm:rounded-[24px] border border-slate-200/80 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all p-2.5 sm:p-4 min-w-0"
                    >
                      <div>
                        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[16/10] bg-slate-100">
                          <img
                            src={cake.image}
                            alt={cake.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/80 text-white text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-wider truncate max-w-[62%]">
                            {cake.caption || cake.tags?.[1] || cake.category}
                          </span>
                          <span className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-400 text-slate-950 text-[9.5px] sm:text-[11px] font-black shadow-2xs shrink-0">
                            ★ {(cake.rating ?? 4.8).toFixed(1)}
                          </span>
                        </div>

                        <div className="pt-2.5 sm:pt-4 px-0.5 sm:px-1">
                          {isEditingThis ? (
                            <div className="space-y-1.5 sm:space-y-2">
                              <input
                                type="text"
                                value={editingProductDraft.name}
                                onChange={(e) =>
                                  setEditingProductDraft((d) => ({ ...d, name: e.target.value }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                                placeholder="Cake Name"
                              />
                              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                                <input
                                  type="number"
                                  value={editingProductDraft.price}
                                  onChange={(e) =>
                                    setEditingProductDraft((d) => ({
                                      ...d,
                                      price: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-[#4c1d95]"
                                  placeholder="Price ₹"
                                />
                                <input
                                  type="text"
                                  value={editingProductDraft.caption}
                                  onChange={(e) =>
                                    setEditingProductDraft((d) => ({
                                      ...d,
                                      caption: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                  placeholder="Caption"
                                />
                              </div>
                              <textarea
                                rows={2}
                                value={editingProductDraft.description}
                                onChange={(e) =>
                                  setEditingProductDraft((d) => ({
                                    ...d,
                                    description: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-1.5 sm:gap-2 min-w-0">
                                <h4 className="font-black text-xs sm:text-base text-slate-900 leading-tight line-clamp-1">
                                  {cake.name}
                                </h4>
                                <span className="font-black text-xs sm:text-base text-[#4c1d95] shrink-0 tabular-nums leading-tight">
                                  ₹{Number(cake.price).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-[10px] sm:text-xs text-slate-500 mt-1 line-clamp-2 leading-snug sm:leading-relaxed">
                                {cake.description}
                              </p>
                              <p className="text-[9.5px] sm:text-[11px] text-slate-400 mt-1 sm:mt-1.5 font-semibold truncate">
                                {cake.category} · {cake.servings}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 sm:pt-4 mt-2 sm:mt-3 border-t border-slate-100 grid grid-cols-2 gap-1.5 sm:gap-2.5">
                        {isEditingThis ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveUpdateProduct(cake.id)}
                              className="py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#4c1d95] text-white text-[11px] sm:text-xs font-extrabold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProductId(null)}
                              className="py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditProduct(cake)}
                              className="py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-[#f3e8ff] hover:bg-[#e9d5ff] text-[#5b21b6] text-[11px] sm:text-xs font-extrabold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingProductId === cake.id}
                              onClick={() => handleDeleteProduct(cake)}
                              className="py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[11px] sm:text-xs font-extrabold transition-colors flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer disabled:opacity-50 min-w-0"
                            >
                              <span className="material-symbols-outlined text-xs sm:text-sm shrink-0">delete</span>
                              <span className="truncate">{deletingProductId === cake.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              PRIVILEGE 2B: INSPIRATION GALLERY MANAGEMENT (Supabase `gallery_items` & `gallery_settings`)
          ================================================================== */}
          {activeTab === 'Gallery' && (
            <section className="bg-surface-container-low rounded-2xl p-3 sm:p-6 border border-outline-variant/40 flex flex-col gap-5 sm:gap-6 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/30 pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                    Explore Our Design Inspiration Gallery ({galleryList.length} Items)
                  </h2>
                </div>
              </div>

              {/* Create New Gallery Item Form (`gallery_items` + `app-files` Storage) */}
              <form
                onSubmit={handleInsertGalleryItem}
                className="bg-surface rounded-2xl p-4 sm:p-5 border border-outline-variant/40 space-y-4"
              >
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">add_photo_alternate</span>
                  <span>Create New Gallery Item &amp; Upload Cake Image</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Heading / Cake Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGalleryTitle}
                      onChange={(e) => setNewGalleryTitle(e.target.value)}
                      placeholder="e.g. Royal Berry Drip"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Sub-Heading / Signature Notes
                    </label>
                    <input
                      type="text"
                      value={newGallerySubHeading}
                      onChange={(e) => setNewGallerySubHeading(e.target.value)}
                      placeholder="e.g. Ruby Couverture · Vanilla Sponge"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Type / Category Badge *
                    </label>
                    <input
                      type="text"
                      required
                      value={newGalleryCategory}
                      onChange={(e) => setNewGalleryCategory(e.target.value)}
                      placeholder="e.g. BESPOKE ROYAL"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Marquee Row
                    </label>
                    <select
                      value={newGalleryRow}
                      onChange={(e) => setNewGalleryRow(Number(e.target.value) === 2 ? 2 : 1)}
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface"
                    >
                      <option value={1}>Row 1 (Floating Left)</option>
                      <option value={2}>Row 2 (Floating Right)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-on-surface">
                      Cake Image (Upload to Supabase Storage &quot;app-files&quot; or Paste URL)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                      <label className="px-3.5 py-2.5 sm:py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">upload_file</span>
                        <span>Upload Cake Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleGalleryImageSelect}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={newGalleryImageUrl}
                        onChange={(e) => setNewGalleryImageUrl(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface"
                      />
                    </div>
                    {(newGalleryImagePreview || newGalleryImageUrl) && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={newGalleryImagePreview || newGalleryImageUrl}
                          alt="Preview"
                          className="w-12 h-12 rounded-lg object-cover border border-outline-variant"
                        />
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          {newGalleryImageFile
                            ? `Ready to upload "${newGalleryImageFile.name}" to app-files`
                            : 'Using provided image URL'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Description *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newGalleryDescription}
                      onChange={(e) => setNewGalleryDescription(e.target.value)}
                      placeholder="Describe the cake design, artistic details, and inspiration..."
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isInsertingGalleryItem}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span>
                      {isInsertingGalleryItem
                        ? 'Uploading & Creating...'
                        : 'Create Gallery Item'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Current Gallery Items Grid with Update & Delete - 2 Designs in a Row on Mobile */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 w-full min-w-0">
                {galleryList.map((item) => {
                  const isEditingThis = editingGalleryId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="bg-surface rounded-xl sm:rounded-2xl border border-outline-variant/40 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all p-2 sm:p-3 min-w-0"
                    >
                      <div>
                        <div className="relative rounded-lg sm:rounded-xl overflow-hidden aspect-[1.2/1] bg-surface-container">
                          <img
                            src={
                              isEditingThis && editingGalleryPreview
                                ? editingGalleryPreview
                                : item.image
                            }
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-2 sm:px-2.5 py-0.5 rounded-full bg-black/75 text-white text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider truncate max-w-[62%]">
                            {item.category}
                          </span>
                          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary text-on-primary text-[8.5px] sm:text-[10px] font-bold shrink-0">
                            Row {item.rowNumber}
                          </span>
                        </div>

                        <div className="pt-2 sm:pt-3 px-0.5 sm:px-1">
                          {isEditingThis ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editingGalleryDraft.title}
                                onChange={(e) =>
                                  setEditingGalleryDraft((d) => ({ ...d, title: e.target.value }))
                                }
                                className="w-full px-2 py-1 rounded border border-outline-variant text-[11px] sm:text-xs font-bold"
                                placeholder="Heading / Title"
                              />
                              <input
                                type="text"
                                value={editingGalleryDraft.subHeading}
                                onChange={(e) =>
                                  setEditingGalleryDraft((d) => ({
                                    ...d,
                                    subHeading: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 rounded border border-outline-variant text-[10px] sm:text-[11px]"
                                placeholder="Sub-heading"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  value={editingGalleryDraft.category}
                                  onChange={(e) =>
                                    setEditingGalleryDraft((d) => ({
                                      ...d,
                                      category: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 rounded border border-outline-variant text-[10px] sm:text-xs uppercase"
                                  placeholder="Type"
                                />
                                <select
                                  value={editingGalleryDraft.rowNumber}
                                  onChange={(e) =>
                                    setEditingGalleryDraft((d) => ({
                                      ...d,
                                      rowNumber: Number(e.target.value) === 2 ? 2 : 1,
                                    }))
                                  }
                                  className="w-full px-1.5 py-1 rounded border border-outline-variant text-[10px] sm:text-xs"
                                >
                                  <option value={1}>Row 1</option>
                                  <option value={2}>Row 2</option>
                                </select>
                              </div>
                              <textarea
                                rows={2}
                                value={editingGalleryDraft.description}
                                onChange={(e) =>
                                  setEditingGalleryDraft((d) => ({
                                    ...d,
                                    description: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 rounded border border-outline-variant text-[10px] sm:text-[11px]"
                              />
                              <label className="block px-2 py-1 rounded bg-primary-container/25 text-primary text-[9px] sm:text-[10px] font-bold text-center cursor-pointer truncate">
                                Upload Replacement Image
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setEditingGalleryFile(f);
                                    setEditingGalleryPreview(URL.createObjectURL(f));
                                  }}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          ) : (
                            <>
                              <h4 className="font-bold text-xs sm:text-sm text-on-surface line-clamp-1 leading-tight">
                                {item.title}
                              </h4>
                              {item.subHeading && (
                                <p className="text-[9.5px] sm:text-[10px] text-primary font-semibold mt-0.5 line-clamp-1 leading-tight">
                                  {item.subHeading}
                                </p>
                              )}
                              <p className="text-[10px] sm:text-[11px] text-on-surface-variant mt-1 line-clamp-2 leading-snug">
                                {item.description}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 sm:pt-3 mt-2 border-t border-outline-variant/20 flex justify-between items-center px-0.5 sm:px-1 gap-1.5">
                        {isEditingThis ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveUpdateGalleryItem(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] sm:text-xs font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGalleryId(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-outline-variant text-[10px] sm:text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditGalleryItem(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary-container/20 text-primary hover:bg-primary-container/35 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingGalleryId === item.id}
                              onClick={() => handleDeleteGalleryItem(item)}
                              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error text-[10px] sm:text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 min-w-0"
                            >
                              <span className="material-symbols-outlined text-xs shrink-0">delete</span>
                              <span className="truncate">{deletingGalleryId === item.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* =================================================================
              PRIVILEGE 3: ORDER HISTORY (Name, Email ID, Phone No., Date, Time of Issue)
          ================================================================== */}
          {activeTab === 'Orders' && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                    Order Placement History ({filteredOrders.length})
                  </h2>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant/30 text-sm w-full sm:w-auto">
                    <span className="material-symbols-outlined text-outline text-sm">
                      filter_list
                    </span>
                    <select
                      className="bg-transparent border-none text-xs text-on-surface focus:outline-none pr-4 cursor-pointer"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All Statuses">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Baking">Baking</option>
                      <option value="Ready">Ready</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Email ID</th>
                      <th className="py-3 px-4">Phone No.</th>
                      <th className="py-3 px-4">Booked Cake Full Name &amp; Type</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Time of Issue</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-xs sm:text-sm">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="py-8 text-center text-sm text-on-surface-variant"
                        >
                          No orders found matching &quot;{searchQuery || statusFilter}&quot;.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-surface-container/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-primary font-mono tabular-nums whitespace-nowrap">
                            {ord.id}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-on-surface whitespace-nowrap">
                            {ord.customer}
                          </td>
                          <td className="py-3.5 px-4 text-on-surface-variant whitespace-nowrap">
                            {ord.customerEmail || '—'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-on-surface tabular-nums whitespace-nowrap">
                            {ord.customerPhone || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-on-surface min-w-[280px] max-w-[420px]">
                            <p className="whitespace-normal break-words leading-snug">
                              <span className="font-bold text-on-surface block">
                                {ord.cakeItem}
                              </span>
                              {ord.cakeTypeDetail && (
                                <span className="text-[11px] font-medium text-primary block mt-0.5">
                                  {ord.cakeTypeDetail}
                                </span>
                              )}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-on-surface font-medium whitespace-nowrap">
                            {ord.date}
                          </td>
                          <td className="py-3.5 px-4 text-primary font-semibold tabular-nums whitespace-nowrap">
                            {ord.timeOfIssue || '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleCycleStatus(ord.id, ord.status)}
                              title="Click to cycle order status (Pending → Baking → Ready)"
                              className="focus:outline-none cursor-pointer"
                            >
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-colors select-none ${
                                  ord.status === 'Ready'
                                    ? 'bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25'
                                    : ord.status === 'Baking'
                                    ? 'bg-primary-container/20 text-primary hover:bg-primary-container/30'
                                    : 'bg-amber-500/15 text-amber-800 hover:bg-amber-500/25'
                                }`}
                              >
                                {ord.status || 'Pending'}
                              </span>
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-on-surface tabular-nums whitespace-nowrap">
                            {(() => {
                              const isCustomOrder =
                                /custom/i.test(ord.cakeItem) ||
                                /custom/i.test(ord.cakeTypeDetail || '') ||
                                /custom/i.test(ord.specialInstructions || '') ||
                                Number(ord.amount) === 0;

                              if (!isCustomOrder) {
                                return (
                                  <>
                                    ₹
                                    {Number(ord.amount).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </>
                                );
                              }

                              if (editingOrderPriceId === ord.id) {
                                return (
                                  <div className="inline-flex items-center justify-end gap-1.5">
                                    <div className="relative flex items-center">
                                      <span className="absolute left-2 text-xs font-bold text-on-surface-variant">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        autoFocus
                                        value={editingOrderPriceValue}
                                        onChange={(e) => setEditingOrderPriceValue(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSaveOrderPrice(ord.id);
                                          } else if (e.key === 'Escape') {
                                            setEditingOrderPriceId(null);
                                          }
                                        }}
                                        placeholder="Enter ₹"
                                        className="w-24 pl-5 pr-2 py-1 rounded-lg border border-primary bg-white text-xs font-extrabold text-on-surface text-right focus:outline-none focus:ring-2 focus:ring-primary/25"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isSavingOrderPrice === ord.id}
                                      onClick={() => handleSaveOrderPrice(ord.id)}
                                      className="px-2 py-1 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
                                      title="Save price & update Dashboard revenue"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOrderPriceId(null)}
                                      className="px-1.5 py-1 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface-variant hover:bg-surface-container cursor-pointer"
                                      title="Cancel"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div className="inline-flex items-center justify-end gap-2">
                                  <span>
                                    ₹
                                    {Number(ord.amount).toLocaleString('en-IN', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditOrderPrice(ord)}
                                    title="Edit Design Custom Cake price (updates Dashboard revenue)"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer bg-primary/15 text-primary hover:bg-primary hover:text-on-primary border border-primary/30"
                                  >
                                    <span className="material-symbols-outlined text-[13px] leading-none">
                                      edit
                                    </span>
                                    <span>
                                      {Number(ord.amount) === 0 ? 'Set Price' : 'Edit'}
                                    </span>
                                  </button>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                              title="Delete order record"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =================================================================
              USER SAVED PROFILE DATA SECTION
              Displays: Full Name, Email Address, Mobile No, Your Address,
              Cover Image, Dietary Note, and Date on which the profile is saved
          ================================================================== */}
          {activeTab === 'Settings' && (
            <section className="bg-white rounded-2xl p-3 sm:p-6 border border-outline-variant/40 flex flex-col gap-5 sm:gap-6 shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs shrink-0">
                    <span className="material-symbols-outlined">badge</span>
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                      User Saved Profile Data ({filteredSavedProfiles.length})
                    </h2>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold">
                  {filteredSavedProfiles.length}{' '}
                  {filteredSavedProfiles.length === 1 ? 'Saved Profile' : 'Saved Profiles'}
                </span>
              </div>

              {/* Visual Profile Cards with Cover Image Banner */}
              {filteredSavedProfiles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-outline-variant/30 p-8 text-center space-y-2 shadow-2xs">
                  <span className="material-symbols-outlined text-3xl text-outline">
                    contact_page
                  </span>
                  <p className="text-sm font-bold text-on-surface">
                    No saved user profiles found yet.
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    When customers save their profile details on the Profile page, their Full Name, Email Address, Mobile No., Address, Cover Image, Dietary Note, and Saved Date appear here automatically.
                  </p>
                </div>
              ) : (
                <>
                  {/* Structured Summary Table of All Saved User Profiles (Placed below heading h2) */}
                  <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/30 bg-white text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                          <th className="py-3 px-4">Cover Image</th>
                          <th className="py-3 px-4">Full Name</th>
                          <th className="py-3 px-4">Email Address</th>
                          <th className="py-3 px-4">Mobile No.</th>
                          <th className="py-3 px-4">Your Address</th>
                          <th className="py-3 px-4">Dietary Note</th>
                          <th className="py-3 px-4">Date Profile Saved</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs sm:text-sm">
                        {filteredSavedProfiles.map((profile) => {
                          const dt = new Date(profile.savedAt);
                          const validDt = !isNaN(dt.getTime());
                          const formattedDate = validDt
                            ? dt.toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—';
                          const formattedTime = validDt
                            ? dt.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                              })
                            : '';

                          return (
                            <tr
                              key={`row-${profile.id}`}
                              className="hover:bg-slate-50 transition-colors bg-white"
                            >
                              <td className="py-3 px-4">
                                {profile.coverImage ? (
                                  <img
                                    src={profile.coverImage}
                                    alt={profile.fullName}
                                    className="w-14 h-10 rounded-lg object-cover border border-outline-variant shadow-2xs"
                                  />
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant">
                                    <span className="material-symbols-outlined text-sm">
                                      hide_image
                                    </span>
                                    None
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-bold text-on-surface whitespace-nowrap">
                                {profile.fullName || '—'}
                              </td>
                              <td className="py-3 px-4 text-on-surface whitespace-nowrap">
                                {profile.email || '—'}
                              </td>
                              <td className="py-3 px-4 font-medium text-on-surface tabular-nums whitespace-nowrap">
                                {profile.phone || '—'}
                              </td>
                              <td className="py-3 px-4 text-on-surface max-w-[220px]">
                                <p className="whitespace-normal break-words">
                                  {profile.address && profile.address !== '—'
                                    ? profile.address
                                    : profile.cityCode || '—'}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-on-surface-variant max-w-[220px]">
                                <p className="whitespace-normal break-words">
                                  {profile.dietaryNotes || '—'}
                                </p>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                                <span className="font-bold text-on-surface block">
                                  {formattedDate}
                                </span>
                                {formattedTime && (
                                  <span className="text-[11px] text-primary font-semibold">
                                    {formattedTime}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-5 w-full min-w-0">
                    {filteredSavedProfiles.map((profile) => {
                      const dt = new Date(profile.savedAt);
                      const validDt = !isNaN(dt.getTime());
                      const formattedSavedDate = validDt
                        ? dt.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—';
                      const formattedSavedTime = validDt
                        ? dt.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : '';

                      return (
                        <div
                          key={profile.id}
                          className="bg-white rounded-xl sm:rounded-2xl border border-outline-variant/40 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col min-w-0"
                        >
                          {/* Cover Image Banner */}
                          <div className="relative h-24 sm:h-36 w-full bg-slate-100 overflow-hidden border-b border-outline-variant/30">
                            {profile.coverImage ? (
                              <>
                                <img
                                  src={profile.coverImage}
                                  alt={`${profile.fullName} Cover`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                                <span className="hidden sm:flex absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 text-white text-[10px] font-bold uppercase tracking-wider items-center gap-1 backdrop-blur-xs">
                                  <span className="material-symbols-outlined text-xs">image</span>
                                  <span>Cover Image Uploaded</span>
                                </span>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-primary/15 via-primary-container/25 to-secondary-container/30 flex flex-col items-center justify-center text-on-surface-variant gap-0.5 sm:gap-1 px-2 text-center">
                                <span className="material-symbols-outlined text-lg sm:text-2xl text-primary/60">
                                  wallpaper
                                </span>
                                <span className="text-[9px] sm:text-[11px] font-semibold">
                                  No Cover Image
                                </span>
                              </div>
                            )}

                            {/* Saved Date Badge */}
                            <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-white/95 text-on-surface text-[8.5px] sm:text-[11px] font-bold shadow-xs flex items-center gap-1 backdrop-blur-xs max-w-[92%] truncate">
                              <span className="material-symbols-outlined text-[10px] sm:text-xs text-primary shrink-0">
                                event_available
                              </span>
                              <span className="truncate">
                                {formattedSavedDate}
                                <span className="hidden sm:inline">
                                  {formattedSavedTime ? ` · ${formattedSavedTime}` : ''}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Profile Body */}
                          <div className="p-2.5 sm:p-5 flex-1 flex flex-col justify-between gap-2.5 sm:gap-4 min-w-0 bg-white">
                            <div className="space-y-2 sm:space-y-3.5 min-w-0">
                              {/* Avatar + Full Name + Role */}
                              <div className="flex items-start justify-between gap-1.5 sm:gap-3 min-w-0">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                  {profile.coverImage ? (
                                    <img
                                      src={profile.coverImage}
                                      alt={profile.fullName}
                                      className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover border border-outline-variant shadow-2xs shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary-container text-on-primary-container font-bold text-xs sm:text-base flex items-center justify-center uppercase shrink-0">
                                      {(profile.fullName || 'CZ').slice(0, 2)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                      Full Name
                                    </span>
                                    <h3 className="text-xs sm:text-base font-black text-on-surface leading-tight truncate">
                                      {profile.fullName || '—'}
                                    </h3>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {profile.role && (
                                    <span
                                      className={`px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold ${
                                        profile.role === 'Admin'
                                          ? 'bg-primary text-on-primary'
                                          : 'bg-secondary-container text-on-secondary-container'
                                      }`}
                                    >
                                      {profile.role}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSavedProfile(profile)}
                                    className="p-1 sm:p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                    title="Remove saved profile record"
                                  >
                                    <span className="material-symbols-outlined text-xs sm:text-base">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Details Grid: Email Address, Mobile No, Your Address, Date Saved */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2.5 pt-0.5 sm:pt-1 min-w-0">
                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50/90 border border-outline-variant/30 min-w-0">
                                  <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px] sm:text-xs text-primary">
                                      mail
                                    </span>
                                    Email
                                  </span>
                                  <p className="text-[10px] sm:text-xs font-semibold text-on-surface mt-0.5 break-all leading-tight">
                                    {profile.email || '—'}
                                  </p>
                                </div>

                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50/90 border border-outline-variant/30 min-w-0">
                                  <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px] sm:text-xs text-primary">
                                      call
                                    </span>
                                    Mobile No.
                                  </span>
                                  <p className="text-[10px] sm:text-xs font-semibold text-on-surface mt-0.5 tabular-nums truncate">
                                    {profile.phone || '—'}
                                  </p>
                                </div>

                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50/90 border border-outline-variant/30 sm:col-span-2 min-w-0">
                                  <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px] sm:text-xs text-primary">
                                      location_on
                                    </span>
                                    Address
                                  </span>
                                  <p className="text-[10px] sm:text-xs font-semibold text-on-surface mt-0.5 line-clamp-2 leading-tight">
                                    {profile.address && profile.address !== '—'
                                      ? profile.address
                                      : profile.cityCode || '—'}
                                  </p>
                                </div>

                                <div className="p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-50/90 border border-outline-variant/30 sm:col-span-2 min-w-0">
                                  <span className="text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[10px] sm:text-xs text-primary">
                                      restaurant
                                    </span>
                                    Dietary Note
                                  </span>
                                  <p className="text-[10px] sm:text-xs font-medium text-on-surface mt-0.5 line-clamp-2 leading-tight">
                                    {profile.dietaryNotes && profile.dietaryNotes !== '—'
                                      ? profile.dietaryNotes
                                      : 'No dietary notes specified'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Footer: Cover Image File & Saved Date */}
                            <div className="pt-2 sm:pt-3 border-t border-outline-variant/25 flex flex-wrap items-center justify-between gap-1 text-[9px] sm:text-[11px] text-on-surface-variant min-w-0">
                              <span className="hidden sm:inline-flex items-center gap-1 font-medium truncate">
                                <span className="material-symbols-outlined text-sm text-primary">
                                  photo_library
                                </span>
                                {profile.coverImage
                                  ? profile.coverImageName || 'Profile Cover Image'
                                  : 'No Cover Image'}
                              </span>
                              <span className="inline-flex items-center gap-1 font-bold text-on-surface tabular-nums truncate">
                                <span className="material-symbols-outlined text-xs sm:text-sm text-primary shrink-0">
                                  schedule
                                </span>
                                <span className="truncate">
                                  Saved {formattedSavedDate}
                                  {formattedSavedTime ? `, ${formattedSavedTime}` : ''}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Footer (Shell) */}
      <footer className="bg-surface-container-low border-t border-outline-variant mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full gap-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary font-headline">CakeZone</span>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              © 2027 CakeZone Patisserie. Admin Console connected to Supabase.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-label">
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer font-semibold"
            >
              Back to Storefront
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
