import React, { useState, useMemo, useEffect } from 'react';
import {
  Order,
  LowStockItem,
  OrderStatus,
  ScreenType,
  CakeProduct,
  LoggedInUserRecord,
  CustomCakeBuilderSettings,
} from '../types';
import { SIGNATURE_CAKES } from '../data/initialData';
import { supabase } from '../supabaseClient';
import {
  fetchOrders,
  updateOrderStatusInDb,
  deleteOrderFromDb,
  fetchInventoryItems,
  updateInventoryItemInDb,
  resolveIsAdminFromSupabase,
  fetchAllLoggedInUsersFromSupabase,
  fetchCakeProducts,
  insertCakeProductInDb,
  updateCakeProductInDb,
  deleteCakeProductFromDb,
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
  customCakeSettings?: CustomCakeBuilderSettings;
  onCustomCakeSettingsChange?: (settings: CustomCakeBuilderSettings) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenNewCustomOrder,
  onLogout,
  cakes: propCakes,
  onCakesChange,
  customCakeSettings: propCustomSettings,
  onCustomCakeSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<
    'Dashboard' | 'Orders' | 'Products' | 'Customers' | 'CustomCake' | 'Settings'
  >('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasLoadedSupabaseOrders, setHasLoadedSupabaseOrders] = useState(false);
  const [loggedInUsers, setLoggedInUsers] = useState<LoggedInUserRecord[]>([]);
  const [catalogCakes, setCatalogCakes] = useState<CakeProduct[]>(
    propCakes && propCakes.length > 0 ? propCakes : SIGNATURE_CAKES
  );
  const [stockItems, setStockItems] = useState<LowStockItem[]>([]);
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
        productsRes,
        inventoryRes,
        customCakesRes,
        loadedSettings,
      ] = await Promise.all([
        fetchOrders(),
        fetchAllLoggedInUsersFromSupabase(),
        fetchCakeProducts(),
        fetchInventoryItems(),
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

      if (productsRes.data && productsRes.data.length > 0) {
        setCatalogCakes(productsRes.data);
        onCakesChange?.(productsRes.data);
      }

      if (inventoryRes.data) {
        setStockItems(inventoryRes.data);
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
  // 1. SUPABASE METRICS CALCULATIONS (Total Revenue, Total Orders, Customer Satisfaction)
  // ==========================================================================
  const totalRevenue = useMemo(() => {
    const ordersSum = orders.reduce((acc, ord) => acc + (Number(ord.amount) || 0), 0);
    return ordersSum;
  }, [orders]);

  const totalOrdersCount = orders.length;

  const customerSatisfaction = useMemo(() => {
    if (!catalogCakes || catalogCakes.length === 0) return { avg: '4.9', totalReviews: 640 };
    const sumRatings = catalogCakes.reduce((acc, c) => acc + (Number(c.rating) || 4.8), 0);
    const totalReviews = catalogCakes.reduce((acc, c) => acc + (Number(c.reviewsCount) || 50), 0);
    const avg = (sumRatings / catalogCakes.length).toFixed(1);
    return { avg, totalReviews };
  }, [catalogCakes]);

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
  // HANDLERS: ORDERS
  // ==========================================================================
  const handleCycleStatus = async (orderId: string) => {
    let updatedStatus: OrderStatus = 'Pending';

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          if (ord.status === 'Pending') updatedStatus = 'Baking';
          else if (ord.status === 'Baking') updatedStatus = 'Delivered';
          else updatedStatus = 'Pending';
          return { ...ord, status: updatedStatus };
        }
        return ord;
      })
    );

    await updateOrderStatusInDb(orderId, updatedStatus);
    showFeedback(`Order ${orderId} status updated to ${updatedStatus}.`);
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
      caption: cake.caption || cake.tags?.[1] || cake.category,
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

  const handleRestock = async (id: string) => {
    let targetRestocked = false;
    let targetRemaining = '';

    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          targetRestocked = !item.isRestocked;
          targetRemaining = targetRestocked ? 'Restocked (Healthy stock)' : item.remaining;
          return {
            ...item,
            isRestocked: targetRestocked,
            remaining: targetRemaining,
          };
        }
        return item;
      })
    );

    await updateInventoryItemInDb(id, {
      isRestocked: targetRestocked,
      remaining: targetRemaining,
    });
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col">
      {/* Admin Feedback Toast */}
      {adminToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 border border-white/15">
          <span className="material-symbols-outlined text-base">verified</span>
          <span>{adminToast}</span>
        </div>
      )}

      {/* TopNavBar (Shell) */}
      <header className="bg-surface sticky top-0 z-40 w-full shadow-xs border-b border-outline-variant/30">
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => onNavigate('storefront')}
              className="text-xl font-black text-primary tracking-tight font-headline cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <span>CakeZone</span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container">
                Admin Panel
              </span>
            </button>
            <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full w-72 border border-outline-variant/30">
              <span className="material-symbols-outlined text-outline text-sm">search</span>
              <input
                className="bg-transparent border-none text-sm focus:outline-none w-full text-on-surface placeholder:text-outline"
                placeholder="Search orders, users, cakes..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-outline hover:text-on-surface text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={loadAllSupabaseAdminData}
              disabled={isRefreshingSupabase}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer transition-all"
              title="Sync live data from Supabase"
            >
              <span
                className={`material-symbols-outlined text-sm text-primary ${
                  isRefreshingSupabase ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span className="hidden sm:inline">
                {isRefreshingSupabase ? 'Syncing...' : 'Sync Supabase'}
              </span>
            </button>

            {/* Notification button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                title="Notifications"
              >
                <span className="material-symbols-outlined">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 p-4 z-50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <h4 className="text-sm font-bold text-on-surface">Admin Alerts</h4>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-on-surface-variant py-2">No active notifications</p>
                  ) : (
                    notifications.map((msg, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-on-surface p-2 rounded-lg bg-surface-container flex gap-2 items-start"
                      >
                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                          info
                        </span>
                        <span>{msg}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar CZ & Sign Out */}
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-xs uppercase">
                {(activeAdminEmail || 'AF').slice(0, 2)}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-on-surface leading-tight">
                  {activeAdminEmail}
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold">Supabase Admin</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-1 px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant hover:text-error hover:border-error/40 hover:bg-surface-container transition-all flex items-center gap-1 cursor-pointer"
                  title="Sign out of CakeZone"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Application Container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar Navigation */}
        <aside className="w-64 hidden md:flex flex-col py-6 px-4 gap-2 bg-surface-container-low border-r border-outline-variant/30 shrink-0">
          <nav className="flex flex-col gap-1.5 w-full">
            <button
              onClick={() => setActiveTab('Dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                activeTab === 'Dashboard'
                  ? 'bg-primary-container text-on-primary-container shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span>All Admin Privileges</span>
            </button>
            <button
              onClick={() => setActiveTab('Customers')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Customers'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">group</span>
                <span>Logged-In People</span>
              </div>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-surface text-primary font-bold">
                {loggedInUsers.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('Products')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Products'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">cake</span>
                <span>Insert / Delete Items</span>
              </div>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-surface text-primary font-bold">
                {catalogCakes.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('Orders')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Orders'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">receipt_long</span>
                <span>Order History</span>
              </div>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-surface text-primary font-bold">
                {orders.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('CustomCake')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'CustomCake'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-lg">auto_fix_high</span>
              <span>Custom Cake &amp; Price</span>
            </button>
            <button
              onClick={() => setActiveTab('Settings')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Settings'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              <span>Kitchen Inventory</span>
            </button>
          </nav>

          {/* Storefront Shortcut Card */}
          <div className="mt-auto p-4 rounded-2xl bg-secondary-container/50 border border-secondary-container flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-secondary-container font-bold text-sm">
              <span className="material-symbols-outlined text-primary">storefront</span>
              <span>Live Storefront</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Changes to cake items and custom cake pricing immediately update the customer storefront.
            </p>
            <button
              onClick={() => onNavigate('storefront')}
              className="w-full py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition-opacity cursor-pointer"
            >
              View Live Storefront →
            </button>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col gap-8 overflow-y-auto">
          {/* Mobile Tab Bar */}
          <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
            {(
              [
                { id: 'Dashboard', label: 'All Overview' },
                { id: 'Customers', label: `Logged-In (${loggedInUsers.length})` },
                { id: 'Products', label: `Products (${catalogCakes.length})` },
                { id: 'Orders', label: `Orders (${orders.length})` },
                { id: 'CustomCake', label: 'Custom Cake Pricing' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-on-background tracking-tight font-headline">
                CakeZone Admin Control Center
              </h1>
              <p className="text-on-surface-variant text-xs sm:text-sm">
                Unified Supabase data synced across Admin accounts:{' '}
                <span className="font-semibold text-primary">
                  {ADMIN_EMAILS.join(' · ')}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenNewCustomOrder}
                className="px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold shadow-xs hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Preview Custom Cake Builder</span>
              </button>
            </div>
          </div>

          {/* =================================================================
              PRIVILEGE 1A: TOP 3 METRIC CARDS (Total Revenue, Total Orders, Customer Satisfaction)
          ================================================================== */}
          {(activeTab === 'Dashboard' || activeTab === 'Customers' || activeTab === 'Orders') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Total Revenue */}
              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/40 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Total Revenue
                  </span>
                  <div className="p-2 rounded-xl bg-primary-container/15 text-primary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-on-surface tabular-nums">
                    ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 flex items-center">
                    Live Supabase
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Extracted across {totalOrdersCount} recorded orders
                </p>
              </div>

              {/* 2. Total Orders */}
              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/40 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Total Orders
                  </span>
                  <div className="p-2 rounded-xl bg-secondary-container text-on-secondary-container">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-on-surface tabular-nums">
                    {totalOrdersCount}
                  </h3>
                  <span className="text-xs font-bold text-primary flex items-center">
                    {orders.filter((o) => o.status !== 'Delivered').length} Active
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  {orders.filter((o) => o.status === 'Delivered').length} delivered ·{' '}
                  {orders.filter((o) => o.status === 'Pending').length} pending
                </p>
              </div>

              {/* 3. Customer Satisfaction */}
              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/40 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Customer Satisfaction
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <span className="material-symbols-outlined">sentiment_satisfied</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-on-surface tabular-nums">
                    {customerSatisfaction.avg} / 5.0
                  </h3>
                  <span className="text-xs font-bold text-amber-500 flex items-center">★ Top Rated</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Based on {customerSatisfaction.totalReviews.toLocaleString('en-IN')} verified reviews across{' '}
                  {catalogCakes.length} cakes
                </p>
              </div>
            </div>
          )}

          {/* =================================================================
              PRIVILEGE 1B: BELOW METRICS -> "TOTAL PEOPLE LOGGED IN" DETAILS
          ================================================================== */}
          {(activeTab === 'Dashboard' || activeTab === 'Customers') && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined">groups</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                        Total People Logged In
                      </h2>
                      <span className="px-3 py-0.5 rounded-full bg-primary text-on-primary text-xs font-black tabular-nums">
                        {loggedInUsers.length} {loggedInUsers.length === 1 ? 'Person' : 'People'}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Extracted from Supabase <code className="font-mono text-primary">profiles</code> &amp; authenticated sessions
                    </p>
                  </div>
                </div>

                {/* Quick Add / Remove Admin Form */}
                <form
                  onSubmit={handleAddAdminByEmail}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto"
                >
                  <input
                    type="email"
                    value={newAdminEmailInput}
                    onChange={(e) => setNewAdminEmailInput(e.target.value)}
                    placeholder="Enter email to Add or Remove Admin..."
                    className="px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-64"
                  />
                  <button
                    type="submit"
                    disabled={Boolean(isUpdatingRole)}
                    className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition-opacity flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                    <span>Add Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAdminByEmail}
                    disabled={Boolean(isUpdatingRole)}
                    className="px-3 py-2 rounded-xl border border-error/40 text-error hover:bg-error/10 text-xs font-bold transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">person_remove</span>
                    <span>Remove Admin</span>
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-container/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">User / Name</th>
                      <th className="py-3 px-4">Email ID</th>
                      <th className="py-3 px-4">Phone No.</th>
                      <th className="py-3 px-4">Role / Admin Access</th>
                      <th className="py-3 px-4">City / Address</th>
                      <th className="py-3 px-4">Last Active / Logged In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-xs sm:text-sm">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-on-surface-variant">
                          No logged-in user records found.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, index) => {
                        const dt = new Date(u.lastLoginAt);
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

                        return (
                          <tr key={u.id} className="hover:bg-surface-container/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-xs text-on-surface-variant">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                {u.avatarUrl ? (
                                  <img
                                    src={u.avatarUrl}
                                    alt={u.name}
                                    className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-primary-container/25 text-primary font-bold text-xs flex items-center justify-center uppercase">
                                    {(u.name || 'CZ').slice(0, 2)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-on-surface leading-tight">{u.name}</p>
                                  <p className="text-[10px] font-mono text-on-surface-variant">
                                    ID: {u.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-on-surface">{u.email}</td>
                            <td className="py-3.5 px-4 text-on-surface-variant tabular-nums">
                              {u.phone || '—'}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    u.role === 'Admin'
                                      ? 'bg-primary text-on-primary'
                                      : 'bg-secondary-container text-on-secondary-container'
                                  }`}
                                >
                                  {u.role}
                                </span>
                                {!isRootOwner && u.email !== '—' && (
                                  <button
                                    type="button"
                                    disabled={isUpdatingRole === u.id}
                                    onClick={() => handleToggleUserAdminRole(u)}
                                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                                      u.role === 'Admin'
                                        ? 'border-error/40 text-error hover:bg-error/10'
                                        : 'border-outline-variant/60 hover:border-primary text-on-surface-variant hover:text-primary'
                                    }`}
                                    title={
                                      u.role === 'Admin'
                                        ? 'Remove from Admin and switch to Customer'
                                        : 'Grant Admin Dashboard access'
                                    }
                                  >
                                    {isUpdatingRole === u.id
                                      ? '...'
                                      : u.role === 'Admin'
                                      ? 'Remove Admin'
                                      : 'Make Admin'}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-on-surface-variant">
                              {u.city || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-xs text-on-surface-variant tabular-nums">
                              <span className="font-semibold text-on-surface">{formattedLoginDate}</span>
                              {formattedLoginTime && (
                                <span className="block text-[11px] opacity-80">
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
            </section>
          )}

          {/* =================================================================
              PRIVILEGE 2: INSERT & DELETE ITEM (Caption, Product Img, Rs, Rating, Description, Category, Servings, Ingredients)
          ================================================================== */}
          {(activeTab === 'Dashboard' || activeTab === 'Products') && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/30 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                    Storefront Catalog Management
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                    Insert &amp; Delete Cake Items ({catalogCakes.length} Active Items)
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Add new cakes with caption, product image (uploaded to private bucket{' '}
                    <code className="font-mono text-primary">app-files</code> or URL), Rs price, rating, and description.
                  </p>
                </div>
              </div>

              {/* Insert New Cake Item Form */}
              <form
                onSubmit={handleInsertProduct}
                className="bg-surface rounded-2xl p-4 sm:p-5 border border-outline-variant/40 space-y-4"
              >
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Insert New Cake Item into Storefront</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Cake Name */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Cake Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCakeName}
                      onChange={(e) => setNewCakeName(e.target.value)}
                      placeholder="e.g. Belgian Hazelnut Praline"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Caption / Badge */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Caption / Highlight Tag *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCakeCaption}
                      onChange={(e) => setNewCakeCaption(e.target.value)}
                      placeholder="e.g. Best Seller / Chef Special"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Price in Rs (₹) */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Price (Rs / ₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newCakePrice}
                      onChange={(e) => setNewCakePrice(e.target.value)}
                      placeholder="e.g. 999"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Rating & Reviews */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
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
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Reviews
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newCakeReviewsCount}
                        onChange={(e) => setNewCakeReviewsCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Category
                    </label>
                    <select
                      value={newCakeCategory}
                      onChange={(e) =>
                        setNewCakeCategory(e.target.value as CakeProduct['category'])
                      }
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Chocolate">Chocolate</option>
                      <option value="Birthday">Birthday</option>
                      <option value="Vanilla">Vanilla</option>
                      <option value="Red Velvet">Red Velvet</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  {/* Servings */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Servings / Weight
                    </label>
                    <input
                      type="text"
                      value={newCakeServings}
                      onChange={(e) => setNewCakeServings(e.target.value)}
                      placeholder="e.g. 8 - 10 Servings (1 Kg)"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Ingredients */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Key Ingredients
                    </label>
                    <input
                      type="text"
                      value={newCakeIngredients}
                      onChange={(e) => setNewCakeIngredients(e.target.value)}
                      placeholder="e.g. Belgian dark chocolate, French butter..."
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Product Image Upload ("app-files" Supabase Storage) OR Image URL + Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-on-surface">
                      Product Image (Upload to Supabase Storage &quot;app-files&quot; or Paste Image URL)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="px-3.5 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">upload_file</span>
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
                        placeholder="Or paste image URL (/assets/... or https://...)"
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {(newCakeImagePreview || newCakeImageUrl) && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={newCakeImagePreview || newCakeImageUrl}
                          alt="Preview"
                          className="w-12 h-12 rounded-lg object-cover border border-outline-variant"
                        />
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          {newCakeImageFile
                            ? `Ready to upload "${newCakeImageFile.name}" to app-files`
                            : 'Using provided image URL'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Product Description *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={newCakeDescription}
                      onChange={(e) => setNewCakeDescription(e.target.value)}
                      placeholder="Describe the flavor profile, sponge layers, ganache, and finishing..."
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isInsertingProduct}
                    className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                    <span>
                      {isInsertingProduct ? 'Uploading & Inserting...' : 'Insert Item into Catalog'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Current Products Grid with Update & Delete Privilege */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {catalogCakes.map((cake) => {
                  const isEditingThis = editingProductId === cake.id;
                  return (
                    <div
                      key={cake.id}
                      className="bg-surface rounded-2xl border border-outline-variant/40 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all p-2.5"
                    >
                      <div>
                        <div className="relative rounded-xl overflow-hidden aspect-[1.2/1] bg-surface-container">
                          <img
                            src={cake.image}
                            alt={cake.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider">
                            {cake.caption || cake.tags?.[1] || cake.category}
                          </span>
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">
                            ★ {(cake.rating ?? 4.8).toFixed(1)}
                          </span>
                        </div>
                        <div className="pt-3 px-1">
                          {isEditingThis ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editingProductDraft.name}
                                onChange={(e) =>
                                  setEditingProductDraft((d) => ({ ...d, name: e.target.value }))
                                }
                                className="w-full px-2 py-1 rounded border border-outline-variant text-xs font-bold"
                                placeholder="Cake Name"
                              />
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="number"
                                  value={editingProductDraft.price}
                                  onChange={(e) =>
                                    setEditingProductDraft((d) => ({
                                      ...d,
                                      price: Number(e.target.value),
                                    }))
                                  }
                                  className="w-full px-2 py-1 rounded border border-outline-variant text-xs font-bold text-primary"
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
                                  className="w-full px-2 py-1 rounded border border-outline-variant text-xs"
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
                                className="w-full px-2 py-1 rounded border border-outline-variant text-[11px]"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm text-on-surface line-clamp-1">
                                  {cake.name}
                                </h4>
                                <span className="font-black text-sm text-primary shrink-0 tabular-nums">
                                  ₹{Number(cake.price).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2">
                                {cake.description}
                              </p>
                              <p className="text-[10px] text-on-surface-variant/80 mt-1 font-medium">
                                {cake.category} · {cake.servings}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 mt-2 border-t border-outline-variant/20 flex justify-between items-center px-1 gap-1.5">
                        {isEditingThis ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveUpdateProduct(cake.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingProductId(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditProduct(cake)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary-container/20 text-primary hover:bg-primary-container/35 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingProductId === cake.id}
                              onClick={() => handleDeleteProduct(cake)}
                              className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                              <span>{deletingProductId === cake.id ? 'Deleting...' : 'Delete'}</span>
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
          {(activeTab === 'Dashboard' || activeTab === 'Orders') && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                    Complete Order Audit Log
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                    Order Placement History ({filteredOrders.length})
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Displays customer Name, Email ID, Phone No., Date, and exact Time of Issue extracted from Supabase
                  </p>
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
                      <option value="Delivered">Delivered</option>
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
                              onClick={() => handleCycleStatus(ord.id)}
                              title="Click to cycle order status"
                              className="focus:outline-none cursor-pointer"
                            >
                              {ord.status === 'Pending' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 transition-colors">
                                  Pending
                                </span>
                              )}
                              {ord.status === 'Baking' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-container/20 text-primary hover:bg-primary-container/30 transition-colors">
                                  Baking
                                </span>
                              )}
                              {ord.status === 'Delivered' && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 transition-colors">
                                  Delivered
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-on-surface tabular-nums whitespace-nowrap">
                            ₹{Number(ord.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              PRIVILEGE 4: UPDATE DESIGN CUSTOM CAKE DATA & ITS PRICE
          ================================================================== */}
          {(activeTab === 'Dashboard' || activeTab === 'CustomCake') && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant/30 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                    Bespoke Configurator Pricing &amp; Options
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                    Update Design Custom Cake Data &amp; Prices
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Modify tier prices, guest counts, accent pricing, sponge flavors, fillings, and finishes for the Design Custom Cake studio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBuilderSettings}
                  disabled={isSavingCustomSettings}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>
                    {isSavingCustomSettings
                      ? 'Saving to Supabase...'
                      : 'Save Custom Cake Settings'}
                  </span>
                </button>
              </div>

              {/* Tier Architecture & Price Editor */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-on-surface">
                    1. Tier Architecture &amp; Base Prices (Rs / ₹)
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-on-surface-variant">
                      Price Per Bespoke Accent (₹):
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={builderSettings.accentPrice}
                      onChange={(e) =>
                        setBuilderSettings((prev) => ({
                          ...prev,
                          accentPrice: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-28 px-3 py-1.5 rounded-xl border border-outline-variant bg-surface text-xs font-bold text-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {builderSettings.tiers.map((tier) => (
                    <div
                      key={tier.count}
                      className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-primary uppercase">
                          Tier {tier.count}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{Number(tier.price).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-0.5">
                          Display Label
                        </label>
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) =>
                            handleTierChange(tier.count, 'label', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs bg-surface-container/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-0.5">
                          Serving / Guest Capacity
                        </label>
                        <input
                          type="text"
                          value={tier.guests}
                          onChange={(e) =>
                            handleTierChange(tier.count, 'guests', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs bg-surface-container/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-0.5">
                          Tier Price (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tier.price}
                          onChange={(e) =>
                            handleTierChange(tier.count, 'price', e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs font-bold text-primary bg-surface-container/30"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sponge Flavors, Fillings, Finishes, Accents Editors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sponge Flavors */}
                <div className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    2. Artisanal Sponge Flavors ({builderSettings.spongeFlavors.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {builderSettings.spongeFlavors.map((flavor) => (
                      <span
                        key={flavor}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface"
                      >
                        <span>{flavor}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBuilderSettings((prev) => ({
                              ...prev,
                              spongeFlavors: prev.spongeFlavors.filter((f) => f !== flavor),
                            }))
                          }
                          className="text-on-surface-variant hover:text-error font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFlavorInput}
                      onChange={(e) => setNewFlavorInput(e.target.value)}
                      placeholder="Add new sponge flavor..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-outline-variant text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFlavorInput.trim()) return;
                        setBuilderSettings((prev) => ({
                          ...prev,
                          spongeFlavors: [...prev.spongeFlavors, newFlavorInput.trim()],
                        }));
                        setNewFlavorInput('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Core Fillings */}
                <div className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    3. Handcrafted Core Fillings ({builderSettings.fillings.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {builderSettings.fillings.map((fill) => (
                      <span
                        key={fill}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface"
                      >
                        <span>{fill}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBuilderSettings((prev) => ({
                              ...prev,
                              fillings: prev.fillings.filter((f) => f !== fill),
                            }))
                          }
                          className="text-on-surface-variant hover:text-error font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFillingInput}
                      onChange={(e) => setNewFillingInput(e.target.value)}
                      placeholder="Add new core filling..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-outline-variant text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFillingInput.trim()) return;
                        setBuilderSettings((prev) => ({
                          ...prev,
                          fillings: [...prev.fillings, newFillingInput.trim()],
                        }));
                        setNewFillingInput('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Exterior Finishes */}
                <div className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    4. Exterior Finishes ({builderSettings.exteriorFinishes.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {builderSettings.exteriorFinishes.map((fin) => (
                      <span
                        key={fin}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface"
                      >
                        <span>{fin}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBuilderSettings((prev) => ({
                              ...prev,
                              exteriorFinishes: prev.exteriorFinishes.filter((f) => f !== fin),
                            }))
                          }
                          className="text-on-surface-variant hover:text-error font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFinishInput}
                      onChange={(e) => setNewFinishInput(e.target.value)}
                      placeholder="Add new exterior finish..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-outline-variant text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFinishInput.trim()) return;
                        setBuilderSettings((prev) => ({
                          ...prev,
                          exteriorFinishes: [...prev.exteriorFinishes, newFinishInput.trim()],
                        }));
                        setNewFinishInput('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Bespoke Accents */}
                <div className="p-4 rounded-xl bg-surface border border-outline-variant/40 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    5. Bespoke Accents (+₹{builderSettings.accentPrice} ea)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {builderSettings.accents.map((acc) => (
                      <span
                        key={acc}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface"
                      >
                        <span>{acc}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setBuilderSettings((prev) => ({
                              ...prev,
                              accents: prev.accents.filter((a) => a !== acc),
                            }))
                          }
                          className="text-on-surface-variant hover:text-error font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAccentInput}
                      onChange={(e) => setNewAccentInput(e.target.value)}
                      placeholder="Add new bespoke accent..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-outline-variant text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newAccentInput.trim()) return;
                        setBuilderSettings((prev) => ({
                          ...prev,
                          accents: [...prev.accents, newAccentInput.trim()],
                        }));
                        setNewAccentInput('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Submitted Custom Cakes in Supabase (`custom_cakes` table) */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-on-surface">
                  Submitted Custom Cake Designs in Supabase ({customCakesList.length})
                </h3>
                {customCakesList.length === 0 ? (
                  <p className="text-xs text-on-surface-variant bg-surface p-4 rounded-xl border border-outline-variant/30">
                    No customer custom cake records in <code className="font-mono">custom_cakes</code> table yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/30 bg-surface-container/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                          <th className="py-3 px-4">Tiers</th>
                          <th className="py-3 px-4">Sponge Flavor</th>
                          <th className="py-3 px-4">Core Filling</th>
                          <th className="py-3 px-4">Inscription</th>
                          <th className="py-3 px-4">Price (₹)</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 text-xs">
                        {customCakesList.map((cc) => {
                          const isEditing = editingCustomCakeId === cc.id;
                          return (
                            <tr key={cc.id} className="hover:bg-surface-container/40">
                              <td className="py-3 px-4 font-bold text-primary">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="1"
                                    max="4"
                                    value={editingCustomCakeDraft.tiers ?? cc.tiers}
                                    onChange={(e) =>
                                      setEditingCustomCakeDraft((d) => ({
                                        ...d,
                                        tiers: Number(e.target.value),
                                      }))
                                    }
                                    className="w-16 px-2 py-1 rounded border border-outline-variant"
                                  />
                                ) : (
                                  `${cc.tiers} Tiers`
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={
                                      editingCustomCakeDraft.sponge_flavor ?? cc.sponge_flavor
                                    }
                                    onChange={(e) =>
                                      setEditingCustomCakeDraft((d) => ({
                                        ...d,
                                        sponge_flavor: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded border border-outline-variant"
                                  />
                                ) : (
                                  cc.sponge_flavor
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editingCustomCakeDraft.filling ?? cc.filling}
                                    onChange={(e) =>
                                      setEditingCustomCakeDraft((d) => ({
                                        ...d,
                                        filling: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded border border-outline-variant"
                                  />
                                ) : (
                                  cc.filling
                                )}
                              </td>
                              <td className="py-3 px-4 italic text-on-surface-variant">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={
                                      editingCustomCakeDraft.inscription ?? cc.inscription
                                    }
                                    onChange={(e) =>
                                      setEditingCustomCakeDraft((d) => ({
                                        ...d,
                                        inscription: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded border border-outline-variant"
                                  />
                                ) : (
                                  `"${cc.inscription}"`
                                )}
                              </td>
                              <td className="py-3 px-4 font-black text-on-surface tabular-nums">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      editingCustomCakeDraft.estimated_price ??
                                      cc.estimated_price
                                    }
                                    onChange={(e) =>
                                      setEditingCustomCakeDraft((d) => ({
                                        ...d,
                                        estimated_price: Number(e.target.value),
                                      }))
                                    }
                                    className="w-24 px-2 py-1 rounded border border-outline-variant font-bold text-primary"
                                  />
                                ) : (
                                  `₹${Number(cc.estimated_price).toLocaleString('en-IN')}`
                                )}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => cc.id && handleSaveCustomCakeRow(cc.id)}
                                      className="px-2.5 py-1 rounded bg-primary text-on-primary font-bold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingCustomCakeId(null)}
                                      className="px-2 py-1 rounded border border-outline-variant cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditCustomCakeRow(cc)}
                                      className="px-2.5 py-1 rounded bg-primary-container/20 text-primary font-bold hover:bg-primary-container/35 cursor-pointer"
                                    >
                                      Edit Price / Data
                                    </button>
                                    {cc.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCustomCakeRow(cc.id!)}
                                        className="px-2 py-1 rounded text-error hover:bg-error/10 font-bold cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Kitchen Inventory / Settings Section */}
          {activeTab === 'Settings' && (
            <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex flex-col gap-4 shadow-xs">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-on-surface">Kitchen Inventory &amp; Stock</h2>
                <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-bold">
                  {stockItems.filter((i) => !i.isRestocked).length} low stock
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {stockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-outline-variant/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold">
                        <span className="material-symbols-outlined text-sm">{item.icon}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface leading-tight">
                          {item.name}
                        </h4>
                        <p
                          className={`text-xs font-medium ${
                            item.isRestocked ? 'text-emerald-600' : 'text-error'
                          }`}
                        >
                          {item.remaining}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestock(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        item.isRestocked
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-primary-container text-on-primary-container hover:opacity-90'
                      }`}
                    >
                      {item.isRestocked ? 'Restocked ✓' : 'Restock'}
                    </button>
                  </div>
                ))}
              </div>
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
