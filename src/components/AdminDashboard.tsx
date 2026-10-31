import React, { useState, useMemo, useEffect } from 'react';
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
    'Dashboard' | 'Orders' | 'Products' | 'Gallery' | 'Customers' | 'Settings'
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
              onClick={() => setActiveTab('Gallery')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Gallery'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">collections</span>
                <span>Inspiration Gallery</span>
              </div>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-surface text-primary font-bold">
                {galleryList.length}
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
              onClick={() => setActiveTab('Settings')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Settings'
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-lg">badge</span>
                <span>User Saved Profiles</span>
              </div>
              <span className="px-2 py-0.5 text-[11px] rounded-full bg-surface text-primary font-bold">
                {savedProfiles.length}
              </span>
            </button>
          </nav>

          {/* Storefront Shortcut Card */}
          <div className="mt-auto p-4 rounded-2xl bg-secondary-container/50 border border-secondary-container flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-secondary-container font-bold text-sm">
              <span className="material-symbols-outlined text-primary">storefront</span>
              <span>Live Storefront</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Changes to cake items, gallery designs, and custom cake pricing immediately update the customer storefront.
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
                { id: 'Gallery', label: `Gallery (${galleryList.length})` },
                { id: 'Orders', label: `Orders (${orders.length})` },
                { id: 'Settings', label: `Saved Profiles (${savedProfiles.length})` },
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
              PRIVILEGE 2B: INSPIRATION GALLERY MANAGEMENT (Supabase `gallery_items` & `gallery_settings`)
          ================================================================== */}
          {(activeTab === 'Dashboard' || activeTab === 'Gallery') && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-outline-variant/30 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                    Supabase Gallery Studio (`gallery_items` &amp; `gallery_settings` with RLS `auth.uid()`)
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                    Explore Our Design Inspiration Gallery ({galleryList.length} Items)
                  </h2>
                  <p className="text-xs text-on-surface-variant">
                    Manage section heading, sub-heading, description, create new gallery items, upload cake images to Supabase Storage, update, and delete items.
                  </p>
                </div>
              </div>

              {/* Section Header Form (`gallery_settings`) */}
              <form
                onSubmit={handleSaveGalleryHeaderAdmin}
                className="bg-surface rounded-2xl p-4 sm:p-5 border border-outline-variant/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">title</span>
                    <span>Gallery Section Header (`gallery_settings`)</span>
                  </h3>
                  <button
                    type="submit"
                    disabled={isSavingGalleryHeader}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    {isSavingGalleryHeader ? 'Saving...' : 'Save Section Header'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Main Heading
                    </label>
                    <input
                      type="text"
                      value={galleryHeader.heading}
                      onChange={(e) =>
                        setGalleryHeader((prev) => ({ ...prev, heading: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Highlighted Sub-Heading
                    </label>
                    <input
                      type="text"
                      value={galleryHeader.subHeading}
                      onChange={(e) =>
                        setGalleryHeader((prev) => ({ ...prev, subHeading: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">
                      Section Description
                    </label>
                    <input
                      type="text"
                      value={galleryHeader.description}
                      onChange={(e) =>
                        setGalleryHeader((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-xs sm:text-sm text-on-surface"
                    />
                  </div>
                </div>
              </form>

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
                    <div className="flex items-center gap-3">
                      <label className="px-3.5 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1.5">
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
                    className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
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

              {/* Current Gallery Items Grid with Update & Delete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {galleryList.map((item) => {
                  const isEditingThis = editingGalleryId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="bg-surface rounded-2xl border border-outline-variant/40 overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all p-2.5"
                    >
                      <div>
                        <div className="relative rounded-xl overflow-hidden aspect-[1.2/1] bg-surface-container">
                          <img
                            src={
                              isEditingThis && editingGalleryPreview
                                ? editingGalleryPreview
                                : item.image
                            }
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider">
                            {item.category}
                          </span>
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                            Row {item.rowNumber}
                          </span>
                        </div>

                        <div className="pt-3 px-1">
                          {isEditingThis ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={editingGalleryDraft.title}
                                onChange={(e) =>
                                  setEditingGalleryDraft((d) => ({ ...d, title: e.target.value }))
                                }
                                className="w-full px-2 py-1 rounded border border-outline-variant text-xs font-bold"
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
                                className="w-full px-2 py-1 rounded border border-outline-variant text-[11px]"
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
                                  className="w-full px-2 py-1 rounded border border-outline-variant text-xs uppercase"
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
                                  className="w-full px-2 py-1 rounded border border-outline-variant text-xs"
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
                                className="w-full px-2 py-1 rounded border border-outline-variant text-[11px]"
                              />
                              <label className="block px-2 py-1 rounded bg-primary-container/25 text-primary text-[10px] font-bold text-center cursor-pointer">
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
                              <h4 className="font-bold text-sm text-on-surface line-clamp-1">
                                {item.title}
                              </h4>
                              {item.subHeading && (
                                <p className="text-[10px] text-primary font-semibold mt-0.5 line-clamp-1">
                                  {item.subHeading}
                                </p>
                              )}
                              <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2">
                                {item.description}
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
                              onClick={() => handleSaveUpdateGalleryItem(item.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGalleryId(null)}
                              className="px-2.5 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEditGalleryItem(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-primary-container/20 text-primary hover:bg-primary-container/35 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingGalleryId === item.id}
                              onClick={() => handleDeleteGalleryItem(item)}
                              className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error hover:text-on-error text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                              <span>{deletingGalleryId === item.id ? 'Deleting...' : 'Delete'}</span>
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
              USER SAVED PROFILE DATA SECTION
              Displays: Full Name, Email Address, Mobile No, Your Address,
              Cover Image, Dietary Note, and Date on which the profile is saved
          ================================================================== */}
          {(activeTab === 'Settings' || activeTab === 'Dashboard') && (
            <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 border border-outline-variant/40 flex flex-col gap-6 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined">badge</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
                        Supabase Saved Customer Profiles (`profiles` &amp; `app-files`)
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-on-surface font-headline">
                      User Saved Profile Data ({filteredSavedProfiles.length})
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      View each user&apos;s Full Name, Email Address, Mobile No., Your Address, Cover Image, Dietary Note, and the Date on which the profile was saved.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold">
                  {filteredSavedProfiles.length}{' '}
                  {filteredSavedProfiles.length === 1 ? 'Saved Profile' : 'Saved Profiles'}
                </span>
              </div>

              {/* Visual Profile Cards with Cover Image Banner */}
              {filteredSavedProfiles.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-outline-variant/30 p-8 text-center space-y-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                          className="bg-surface rounded-2xl border border-outline-variant/40 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col"
                        >
                          {/* Cover Image Banner */}
                          <div className="relative h-36 w-full bg-surface-container overflow-hidden border-b border-outline-variant/30">
                            {profile.coverImage ? (
                              <>
                                <img
                                  src={profile.coverImage}
                                  alt={`${profile.fullName} Cover`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                                  <span className="material-symbols-outlined text-xs">image</span>
                                  <span>Cover Image Uploaded</span>
                                </span>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-r from-primary/15 via-primary-container/25 to-secondary-container/30 flex flex-col items-center justify-center text-on-surface-variant gap-1">
                                <span className="material-symbols-outlined text-2xl text-primary/60">
                                  wallpaper
                                </span>
                                <span className="text-[11px] font-semibold">
                                  No Cover Image Uploaded
                                </span>
                              </div>
                            )}

                            {/* Saved Date Badge */}
                            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-surface/90 text-on-surface text-[11px] font-bold shadow-xs flex items-center gap-1 backdrop-blur-xs">
                              <span className="material-symbols-outlined text-xs text-primary">
                                event_available
                              </span>
                              <span>
                                Saved: {formattedSavedDate}
                                {formattedSavedTime ? ` · ${formattedSavedTime}` : ''}
                              </span>
                            </div>
                          </div>

                          {/* Profile Body */}
                          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                            <div className="space-y-3.5">
                              {/* Avatar + Full Name + Role */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {profile.coverImage ? (
                                    <img
                                      src={profile.coverImage}
                                      alt={profile.fullName}
                                      className="w-12 h-12 rounded-xl object-cover border border-outline-variant shadow-2xs shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container font-bold text-base flex items-center justify-center uppercase shrink-0">
                                      {(profile.fullName || 'CZ').slice(0, 2)}
                                    </div>
                                  )}
                                  <div>
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                                      Full Name
                                    </span>
                                    <h3 className="text-base font-black text-on-surface leading-tight">
                                      {profile.fullName || '—'}
                                    </h3>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {profile.role && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                    title="Remove saved profile record"
                                  >
                                    <span className="material-symbols-outlined text-base">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* Details Grid: Email Address, Mobile No, Your Address, Date Saved */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                <div className="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/25">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs text-primary">
                                      mail
                                    </span>
                                    Email Address
                                  </span>
                                  <p className="text-xs font-semibold text-on-surface mt-0.5 break-all">
                                    {profile.email || '—'}
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/25">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs text-primary">
                                      call
                                    </span>
                                    Mobile No.
                                  </span>
                                  <p className="text-xs font-semibold text-on-surface mt-0.5 tabular-nums">
                                    {profile.phone || '—'}
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/25 sm:col-span-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs text-primary">
                                      location_on
                                    </span>
                                    Your Address
                                  </span>
                                  <p className="text-xs font-semibold text-on-surface mt-0.5">
                                    {profile.address && profile.address !== '—'
                                      ? profile.address
                                      : profile.cityCode || '—'}
                                  </p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/25 sm:col-span-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs text-primary">
                                      restaurant
                                    </span>
                                    Dietary Note
                                  </span>
                                  <p className="text-xs font-medium text-on-surface mt-0.5 whitespace-pre-wrap">
                                    {profile.dietaryNotes && profile.dietaryNotes !== '—'
                                      ? profile.dietaryNotes
                                      : 'No dietary notes specified'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Footer: Cover Image File & Saved Date */}
                            <div className="pt-3 border-t border-outline-variant/25 flex flex-wrap items-center justify-between gap-2 text-[11px] text-on-surface-variant">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-sm text-primary">
                                  photo_library
                                </span>
                                {profile.coverImage
                                  ? profile.coverImageName || 'Profile Cover Image'
                                  : 'No Cover Image'}
                              </span>
                              <span className="inline-flex items-center gap-1 font-bold text-on-surface tabular-nums">
                                <span className="material-symbols-outlined text-sm text-primary">
                                  schedule
                                </span>
                                Saved on {formattedSavedDate}
                                {formattedSavedTime ? `, ${formattedSavedTime}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Structured Summary Table of All Saved User Profiles */}
                  <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant/30 bg-surface-container/60 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
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
                              className="hover:bg-surface-container/40 transition-colors"
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
