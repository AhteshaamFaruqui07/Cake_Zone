import React, { useState, useEffect } from 'react';
import { CakeProduct, GalleryItem, GallerySectionSettings } from '../types';
import {
  HERO_CAKE_URL,
  LOGO_URL,
  SIGNATURE_CAKES,
  REVIEWS,
  INITIAL_GALLERY_ITEMS,
  DEFAULT_GALLERY_SECTION_SETTINGS,
} from '../data/initialData';
import {
  createGalleryItemInDb,
  updateGalleryItemInDb,
  deleteGalleryItemFromDb,
  saveGallerySectionSettings,
} from '../services/supabaseData';
import { triggerFlyToCart } from './FlyToCartOverlay';

interface StorefrontProps {
  cakes?: CakeProduct[];
  galleryItems?: GalleryItem[];
  onGalleryItemsChange?: (items: GalleryItem[]) => void;
  gallerySettings?: GallerySectionSettings;
  onGallerySettingsChange?: (settings: GallerySectionSettings) => void;
  isAdmin?: boolean;
  onShowToast?: (msg: string) => void;
  onQuickView: (cake: CakeProduct) => void;
  onOrderNow: (cake: CakeProduct, sourceEl?: HTMLElement) => void;
  onAddToCart?: (cake: CakeProduct, sourceEl?: HTMLElement) => void;
  onOpenConfigurator: () => void;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
  isLoggedIn?: boolean;
  onRequireAuth?: (actionName?: string) => void;
}

export const Storefront: React.FC<StorefrontProps> = ({
  cakes,
  galleryItems: propGalleryItems,
  onGalleryItemsChange,
  gallerySettings: propGallerySettings,
  onGallerySettingsChange,
  isAdmin,
  onShowToast,
  onQuickView,
  onOrderNow,
  onAddToCart,
  onOpenConfigurator,
  userName,
  onUpdateUserName,
  isLoggedIn,
  onRequireAuth,
}) => {
  const [localName, setLocalName] = useState(userName || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cakeSearchQuery, setCakeSearchQuery] = useState<string>('');
  const [cakeSortBy, setCakeSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>(
    'featured'
  );
  const [activePolicyModal, setActivePolicyModal] = useState<
    'terms' | 'privacy' | 'faq' | 'shipping' | null
  >(null);
  const [typedWord, setTypedWord] = useState<string>('Perfection');
  const [likedInspirationIds, setLikedInspirationIds] = useState<Record<string, boolean>>({});

  // Admin Gallery Management State
  const [isGalleryAdminOpen, setIsGalleryAdminOpen] = useState(false);
  const [sectionDraft, setSectionDraft] = useState<GallerySectionSettings>(
    propGallerySettings || DEFAULT_GALLERY_SECTION_SETTINGS
  );
  const [isSavingSection, setIsSavingSection] = useState(false);

  // Create New Gallery Item State
  const [newTitle, setNewTitle] = useState('');
  const [newSubHeading, setNewSubHeading] = useState('');
  const [newCategory, setNewCategory] = useState('BESPOKE ROYAL');
  const [newDescription, setNewDescription] = useState('');
  const [newRowNumber, setNewRowNumber] = useState<1 | 2>(1);
  const [newServings, setNewServings] = useState('10 - 14 Servings');
  const [newLeadTime, setNewLeadTime] = useState('24 Hours Notice');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [isCreatingGalleryItem, setIsCreatingGalleryItem] = useState(false);

  // Edit Existing Gallery Item State
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editGalleryDraft, setEditGalleryDraft] = useState<{
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
    category: '',
    description: '',
    imageUrl: '',
    servings: '',
    leadTime: '',
    rowNumber: 1,
  });
  const [editGalleryFile, setEditGalleryFile] = useState<File | null>(null);
  const [editGalleryPreview, setEditGalleryPreview] = useState('');
  const [isUpdatingGalleryItem, setIsUpdatingGalleryItem] = useState(false);
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);

  useEffect(() => {
    if (propGallerySettings) {
      setSectionDraft(propGallerySettings);
    }
  }, [propGallerySettings]);

  const activeGallerySettings = propGallerySettings || DEFAULT_GALLERY_SECTION_SETTINGS;
  const activeGalleryItems =
    propGalleryItems && propGalleryItems.length > 0 ? propGalleryItems : INITIAL_GALLERY_ITEMS;

  const row1GalleryItems = activeGalleryItems.filter((item) => item.rowNumber !== 2);
  const row2GalleryItems = activeGalleryItems.filter((item) => item.rowNumber === 2);
  const effectiveRow1 = row1GalleryItems.length > 0 ? row1GalleryItems : activeGalleryItems;
  const effectiveRow2 = row2GalleryItems.length > 0 ? row2GalleryItems : activeGalleryItems;

  const handleSaveGalleryHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSection(true);
    try {
      const { data, error } = await saveGallerySectionSettings(sectionDraft);
      if (error) {
        onShowToast?.(`Error saving gallery header: ${error.message || 'Failed'}`);
        return;
      }
      onGallerySettingsChange?.(data);
      onShowToast?.('Gallery section heading & description saved to Supabase!');
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleCreateGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      onShowToast?.('Please enter a cake heading and description.');
      return;
    }
    setIsCreatingGalleryItem(true);
    try {
      const { data: created, error } = await createGalleryItemInDb(
        {
          title: newTitle,
          subHeading: newSubHeading,
          category: newCategory,
          description: newDescription,
          imageUrl: newImageUrl,
          servings: newServings,
          leadTime: newLeadTime,
          rowNumber: newRowNumber,
          displayOrder: activeGalleryItems.length + 1,
        },
        newImageFile
      );
      if (error || !created) {
        onShowToast?.(`Failed to create gallery item: ${error?.message || 'Error'}`);
        return;
      }
      const nextList = [created, ...activeGalleryItems.filter((i) => i.id !== created.id)];
      onGalleryItemsChange?.(nextList);
      setNewTitle('');
      setNewSubHeading('');
      setNewDescription('');
      setNewImageUrl('');
      setNewImageFile(null);
      setNewImagePreview('');
      onShowToast?.(`"${created.title}" added to Inspiration Gallery in Supabase!`);
    } finally {
      setIsCreatingGalleryItem(false);
    }
  };

  const handleStartEditGalleryItem = (item: GalleryItem) => {
    setIsGalleryAdminOpen(true);
    setEditingGalleryId(item.id);
    setEditGalleryDraft({
      title: item.title,
      subHeading: item.subHeading || '',
      category: item.category,
      description: item.description,
      imageUrl: item.image,
      servings: item.servings,
      leadTime: item.leadTime,
      rowNumber: item.rowNumber,
    });
    setEditGalleryFile(null);
    setEditGalleryPreview('');
  };

  const handleSaveEditGalleryItem = async (itemId: string) => {
    setIsUpdatingGalleryItem(true);
    try {
      const { data: updated, error } = await updateGalleryItemInDb(
        itemId,
        editGalleryDraft,
        editGalleryFile
      );
      if (error || !updated) {
        onShowToast?.(`Error updating gallery item: ${error?.message || 'Failed'}`);
        return;
      }
      const nextList = activeGalleryItems.map((i) => (i.id === itemId ? updated : i));
      onGalleryItemsChange?.(nextList);
      setEditingGalleryId(null);
      setEditGalleryFile(null);
      setEditGalleryPreview('');
      onShowToast?.(`"${updated.title}" updated in Supabase!`);
    } finally {
      setIsUpdatingGalleryItem(false);
    }
  };

  const handleDeleteGalleryItem = async (item: GalleryItem) => {
    setDeletingGalleryId(item.id);
    try {
      await deleteGalleryItemFromDb(item.id, item.storagePath);
      const nextList = activeGalleryItems.filter((i) => i.id !== item.id);
      onGalleryItemsChange?.(nextList);
      onShowToast?.(`"${item.title}" deleted from Supabase gallery.`);
    } finally {
      setDeletingGalleryId(null);
    }
  };

  const toggleInspirationLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedInspirationIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    const fullWord = 'Perfection';
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTypedWord(fullWord);
      return;
    }

    let currentIndex = 0;
    let isDeleting = false;
    let timerId: number;

    setTypedWord('');

    const step = () => {
      if (!isDeleting) {
        currentIndex += 1;
        setTypedWord(fullWord.slice(0, currentIndex));
        if (currentIndex >= fullWord.length) {
          isDeleting = true;
          timerId = window.setTimeout(step, 2200);
        } else {
          timerId = window.setTimeout(step, 175);
        }
      } else {
        currentIndex -= 1;
        setTypedWord(fullWord.slice(0, currentIndex));
        if (currentIndex <= 0) {
          isDeleting = false;
          timerId = window.setTimeout(step, 700);
        } else {
          timerId = window.setTimeout(step, 115);
        }
      }
    };

    timerId = window.setTimeout(step, 500);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  const catalogCakes = cakes && cakes.length > 0 ? cakes : SIGNATURE_CAKES;
  const categories = ['All', 'Birthday', 'Chocolate', 'Vanilla', 'Red Velvet', 'Custom'];

  const filteredCakes = [...catalogCakes]
    .filter((cake) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        cake.category === selectedCategory ||
        cake.tags.includes(selectedCategory);
      if (!matchesCategory) return false;

      const q = cakeSearchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        cake.name.toLowerCase().includes(q) ||
        (cake.category && cake.category.toLowerCase().includes(q)) ||
        cake.description.toLowerCase().includes(q) ||
        (cake.ingredients && cake.ingredients.toLowerCase().includes(q)) ||
        (cake.caption && cake.caption.toLowerCase().includes(q)) ||
        cake.tags.some((t) => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (cakeSortBy === 'price-asc') return a.price - b.price;
      if (cakeSortBy === 'price-desc') return b.price - a.price;
      if (cakeSortBy === 'rating') {
        const ratingDiff = (b.rating ?? 4.8) - (a.rating ?? 4.8);
        if (Math.abs(ratingDiff) > 0.01) return ratingDiff;
        return (b.reviewsCount ?? 90) - (a.reviewsCount ?? 90);
      }
      return 0;
    });

  useEffect(() => {
    if (userName) {
      setLocalName(userName);
    }
  }, [userName]);

  const displayName = userName?.trim() || localName.trim() || 'Guest';

  const handleProtectedAction = (actionCallback: () => void, actionName: string) => {
    if (!isLoggedIn) {
      if (onRequireAuth) {
        onRequireAuth(actionName);
      }
      return;
    }
    actionCallback();
  };

  return (
    <div className="w-full overflow-x-hidden">
      {/* Hero Section with Full Background Video */}
      <section
        className="relative overflow-hidden min-h-[480px] sm:min-h-[560px] md:min-h-[640px] flex items-center py-12 sm:py-16 md:py-24"
        id="home"
      >
        {/* Full Hero Video Background with Soft Luminous Whiteness & Rich Patisserie Colors */}
        <video
          src="/assets/aistudio/kling_20261020_VIDEO_Use_the_up_5466_0_97ab3ed5.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center z-0 filter saturate-[1.18] contrast-[1.02] brightness-[1.07] md:saturate-[1.15] md:contrast-[1.02] md:brightness-[1.05]"
        >
          Your browser does not support the video tag.
        </video>

        {/* Soft Elegant White Tint Scrim adding airy whiteness while keeping video motion vibrant */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/22 to-white/35 md:bg-gradient-to-r md:from-white/45 md:via-white/25 md:to-white/15 z-10 pointer-events-none" />

        {/* Hero Content Canvas */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 w-full">
          <div className="flex flex-col items-start gap-4 sm:gap-5 max-w-xl md:-mt-8 lg:-mt-10">
            {/* Welcome, Guest / User Heading */}
            <div className="inline-flex items-center gap-2 sm:gap-2.5 text-sm sm:text-base md:text-[17px] tracking-tight">
              <svg
                className="w-5 h-5 text-[#5E439C] shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4a2 2 0 0 0-2 2c0 1.1.9 2 2 2s2-.9 2-2a2 2 0 0 0-2-2Z" />
                <path d="M12 2v2" />
                <path d="M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
                <path d="M7 11V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                <path d="M3 15.5c1.5 0 2-1 3.5-1s2 1 3.5 1 2-1 3.5-1 2 1 3.5 1 2-1 3.5-1" />
              </svg>
              <span className="font-medium text-[#5E439C]">Welcome,</span>
              <span className="font-leckerli text-lg sm:text-xl md:text-[22px] text-[#8B38C7] font-normal select-none leading-none">
                {displayName}
              </span>
            </div>

            <h1
              aria-label="Crafted with Love, Baked to Perfection"
              className="text-3xl sm:text-5xl md:text-[62px] font-black font-headline tracking-[-0.03em] text-[#140D26] leading-[1.1] sm:leading-[1.08] drop-shadow-[0_1px_6px_rgba(255,255,255,0.85)] md:drop-shadow-none"
            >
              Crafted with Love,
              <br />
              Baked to{' '}
              <span
                aria-hidden="true"
                className="inline-flex items-baseline text-[#9B4DCA] whitespace-nowrap transition-all duration-150 ease-out after:content-[''] after:inline-block after:w-[2px] sm:after:w-[3px] after:h-[0.82em] after:bg-[#9B4DCA] after:ml-1.5 after:rounded-full after:translate-y-[0.06em] after:animate-[typewriter-blink_1.15s_ease-in-out_infinite] motion-reduce:after:animate-none"
              >
                {typedWord}
              </span>
            </h1>

            <p className="text-sm sm:text-[15px] md:text-base text-[#140D26] md:text-[#3E4C5E] leading-[1.65] max-w-[480px] font-medium sm:font-normal drop-shadow-[0_1px_4px_rgba(255,255,255,0.7)] md:drop-shadow-none">
              Experience the pinnacle of patisserie craftsmanship. Each creation is meticulously
              handcrafted using rare ingredients, French butter, and uncompromising passion.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  handleProtectedAction(() => {
                    const targetEl = document.getElementById('collections');
                    if (targetEl) {
                      const elementTop = targetEl.getBoundingClientRect().top + window.scrollY;
                      window.scrollTo({ top: Math.max(0, elementTop - 76), behavior: 'smooth' });
                    }
                  }, 'browse collections');
                }}
                className="explore-waves-btn group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#6841B8] text-white text-sm font-bold shadow-[0_8px_20px_-6px_rgba(104,65,184,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6841B8] cursor-pointer w-full sm:w-auto"
              >
                {/* Layered SVG Liquid Wave Crest */}
                <svg
                  aria-hidden="true"
                  className="explore-wave-crest"
                  viewBox="0 0 240 60"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="cakezoneWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#D8B4FE" stopOpacity="0.88" />
                      <stop offset="45%" stopColor="#A855F7" stopOpacity="0.75" />
                      <stop offset="100%" stopColor="#0A0810" stopOpacity="0.95" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,22 C30,10 60,34 90,22 C120,10 150,34 180,22 C210,10 225,28 240,22 L240,60 L0,60 Z"
                    fill="url(#cakezoneWaveGrad)"
                  />
                </svg>
                <span className="relative z-10 tracking-wide">Explore Collections</span>
                <svg
                  className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleProtectedAction(onOpenConfigurator, 'design custom cakes');
                }}
                className="cakezone-btn-3 inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white/90 backdrop-blur-md text-[#51328F] text-sm font-bold border border-[#0f0b18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0b18] shadow-xs cursor-pointer w-full sm:w-auto"
              >
                <span className="relative z-10">Design Custom Cake</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Collections Section */}
      <section className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-16 md:py-20 bg-[#FBF7F2]" id="collections">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="max-w-3xl mb-6 sm:mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-6 h-[1.5px] bg-[#8B4513] inline-block" />
              <span className="text-[#8B4513] font-semibold text-xs tracking-[0.2em] uppercase">
                OUR CAKES
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl md:text-[44px] font-bold font-headline text-[#1A1412] tracking-tight leading-tight">
              Explore Our Signature Cakes
            </h2>
            <p className="text-[#5C534E] text-sm sm:text-base md:text-lg mt-2">
              From classic favourites to unique creations, find the perfect cake for your special
              moments.
            </p>
          </div>

          {/* Category Filter Pills + Search & Sort Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-7 sm:mb-9">
            {/* Category Filter Pills (Horizontally scrollable on mobile, single row on desktop) */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto lg:flex-nowrap pb-1.5 lg:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 min-w-0">
              {categories.map((category) => {
                const isActive = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`category-glass-shine-btn px-3.5 sm:px-4 xl:px-5 py-2 rounded-full text-xs sm:text-sm font-medium cursor-pointer shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-[#4E2F21] text-white border border-[#4E2F21] shadow-xs'
                        : 'bg-[#FAF6F0]/90 text-[#2D2420] border border-[#E4DDD3] hover:border-[#4E2F21]/40 hover:bg-[#F3ECE2]/95'
                    }`}
                  >
                    <span className="relative z-10">{category}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar & Sort Selector — Always in a single row */}
            <div className="flex flex-row items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto">
              {/* Instant Search Input */}
              <div className="relative flex-1 min-w-0 sm:w-52 xl:w-60">
                <span className="material-symbols-outlined text-[#6E5A4F] text-[17px] sm:text-[18px] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={cakeSearchQuery}
                  onChange={(e) => setCakeSearchQuery(e.target.value)}
                  placeholder="Search cakes..."
                  aria-label="Search signature cakes"
                  className="w-full pl-9 pr-7 py-2 rounded-full bg-[#FAF6F0]/95 border border-[#E4DDD3] focus:border-[#4E2F21] focus:bg-white text-xs sm:text-sm text-[#1A1412] placeholder:text-[#8C7E75] focus:outline-none transition-colors shadow-2xs"
                />
                {cakeSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCakeSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#E4DDD3]/70 hover:bg-[#D5CBBF] text-[#2D2420] flex items-center justify-center text-[11px] cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative flex items-center bg-[#FAF6F0]/95 border border-[#E4DDD3] hover:border-[#4E2F21]/40 rounded-full px-3 py-2 shadow-2xs shrink-0">
                <span className="material-symbols-outlined text-[#6E5A4F] text-[16px] sm:text-[17px] mr-1 pointer-events-none">
                  sort
                </span>
                <label htmlFor="storefront-cake-sort" className="hidden sm:inline text-[11px] sm:text-xs text-[#6E655F] font-medium mr-1.5 whitespace-nowrap">
                  Sort:
                </label>
                <select
                  id="storefront-cake-sort"
                  value={cakeSortBy}
                  onChange={(e) =>
                    setCakeSortBy(
                      e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'rating'
                    )
                  }
                  className="bg-transparent border-none text-xs sm:text-sm font-semibold text-[#2D2420] focus:outline-none cursor-pointer pr-0.5"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Top Rated (★)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cake Cards Grid */}
          {filteredCakes.length === 0 ? (
            <div className="bg-[#FCF9F5] rounded-2xl border border-[#EDE5DA] p-8 sm:p-12 text-center space-y-3">
              <span className="material-symbols-outlined text-3xl text-[#8B4513]/70">cake</span>
              <h3 className="font-headline font-bold text-base sm:text-lg text-[#1A1412]">
                No cakes found matching your filter
              </h3>
              <p className="text-xs sm:text-sm text-[#5C534E] max-w-md mx-auto">
                Try clearing your search query or switching to &ldquo;All&rdquo; categories to explore our full patisserie collection.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setCakeSearchQuery('');
                  setCakeSortBy('featured');
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#4E2F21] text-white text-xs font-semibold hover:bg-[#3B2217] transition-colors cursor-pointer"
              >
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {filteredCakes.map((cake) => (
              <div
                key={cake.id}
                onClick={() => {
                  handleProtectedAction(() => onQuickView(cake), `view ${cake.name}`);
                }}
                className="bg-[#FCF9F5] rounded-xl sm:rounded-2xl overflow-hidden border border-[#EDE5DA] shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col group p-1.5 sm:p-2 cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg sm:rounded-xl aspect-[1.12/1] bg-[#F3ECE2]">
                  <img
                    src={cake.image}
                    alt={cake.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />
                  {cake.caption && (
                    <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#4E2F21]/90 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                      {cake.caption}
                    </span>
                  )}
                </div>
                <div className="pt-2.5 sm:pt-3.5 pb-1.5 sm:pb-2 px-1 sm:px-2 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-headline font-semibold text-sm sm:text-[19px] text-[#1A1412] leading-snug line-clamp-1">
                      {cake.name}
                    </h3>
                    <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[#5C534E]">
                      <span className="font-semibold text-[#2D2420] tabular-nums">
                        ₹ {cake.price.toLocaleString('en-IN')}
                      </span>{' '}
                      <span>onwards</span>
                    </div>
                    <div className="mt-1 sm:mt-1.5 flex items-center gap-1 text-[11px] sm:text-xs">
                      <span className="text-[#F59E0B] text-xs sm:text-sm leading-none">★</span>
                      <span className="font-semibold text-[#1A1412] tabular-nums">
                        {(cake.rating ?? 4.8).toFixed(1)}
                      </span>
                      <span className="text-[#6E655F] tabular-nums">
                        ({cake.reviewsCount ?? 90})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2.5 mt-2.5 sm:mt-3.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProtectedAction(() => onQuickView(cake), `view ${cake.name}`);
                      }}
                      className="flex-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full border border-[#6E5A4F] text-[#2D2420] text-[10px] sm:text-xs font-medium hover:bg-[#F2EAE0] transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Quick View
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProtectedAction(() => onOrderNow(cake), `order ${cake.name}`);
                      }}
                      className="flex-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-full bg-[#4E2F21] text-white text-[10px] sm:text-xs font-medium hover:bg-[#3B2217] transition-colors shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </section>

      {/* Creative Gallery - Explore Our Design Inspiration (Dual Floating Cake Marquees) */}
      <section
        className="scroll-mt-20 sm:scroll-mt-24 pt-8 pb-14 sm:pt-10 sm:pb-18 md:pt-12 md:pb-20 bg-[#FAF6F0] border-t border-[#EDE5DA]/70 overflow-hidden relative"
        id="inspiration-gallery"
      >
        {/* Header */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-[50px] font-black font-headline text-[#140D26] tracking-tight leading-[1.12]">
            {activeGallerySettings.heading}{' '}
            <span className="italic font-serif bg-gradient-to-r from-[#6841B8] via-[#7C3AED] to-[#A855F7] bg-clip-text text-transparent pr-1">
              {activeGallerySettings.subHeading}
            </span>
          </h2>

          <p className="text-[#5C534E] text-sm sm:text-base md:text-[17px] mt-2.5 max-w-2xl mx-auto leading-relaxed">
            {activeGallerySettings.description}
          </p>
        </div>

        {/* Dual Floating Marquee Container */}
        <div className="relative space-y-4 sm:space-y-5 -mt-1 sm:-mt-2">
          {/* Soft Left & Right Edge Vignettes */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-3 sm:w-24 md:w-32 bg-gradient-to-r from-[#FAF6F0] via-[#FAF6F0]/70 to-transparent z-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-3 sm:w-24 md:w-32 bg-gradient-to-l from-[#FAF6F0] via-[#FAF6F0]/70 to-transparent z-20" />

          {/* Row 1 - Floating Left */}
          <div className="cakezone-marquee-row overflow-hidden py-1.5 -mt-1">
            <div className="cakezone-marquee-track-left gap-2 sm:gap-6 px-2 sm:px-3">
              {[...effectiveRow1, ...effectiveRow1].map((item, idx) => {
                const isLiked = !!likedInspirationIds[item.id];
                return (
                  <div
                    key={`${item.id}-row1-${idx}`}
                    className="group/card relative w-[calc((100vw-24px)/3)] sm:w-[290px] md:w-[310px] h-[145px] sm:h-[330px] md:h-[350px] shrink-0 rounded-[14px] sm:rounded-[24px] bg-white p-1 sm:p-2 shadow-[0_10px_28px_-8px_rgba(20,13,38,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(104,65,184,0.26)] border border-[#EDE5DA] transition-all duration-500 hover:-translate-y-1.5 select-none"
                  >
                    <div className="relative w-full h-full rounded-[10px] sm:rounded-[18px] overflow-hidden bg-[#F3ECE2]">
                      <img
                        src={item.image}
                        alt={item.title}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== window.location.origin + item.fallbackImage) {
                            target.src = item.fallbackImage;
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Top-Left Category Badge */}
                      <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-20 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/92 backdrop-blur-md text-[#1A1412] text-[7px] sm:text-[10px] font-extrabold tracking-[0.06em] sm:tracking-[0.08em] uppercase shadow-xs truncate max-w-[68%]">
                        {item.category}
                      </span>

                      {/* Top-Right Heart Button */}
                      <button
                        type="button"
                        aria-label={`Save ${item.title} to favorites`}
                        onClick={(e) => toggleInspirationLike(item.id, e)}
                        className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-20 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-white/92 backdrop-blur-md flex items-center justify-center shadow-xs transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <svg
                          className={`w-2.5 h-2.5 sm:w-4 sm:h-4 transition-colors duration-200 ${
                            isLiked ? 'text-[#EC4899] fill-[#EC4899]' : 'text-[#5C534E] fill-[#5C534E]/80'
                          }`}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                          />
                        </svg>
                      </button>

                      {/* Hover Overlay with Kicker, Title, Sub-Heading & Description */}
                      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#120924]/95 via-[#120924]/65 to-transparent opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2 sm:p-5">
                        <span className="text-[7px] sm:text-[10px] font-extrabold tracking-[0.12em] sm:tracking-[0.14em] uppercase text-[#C084FC] translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300">
                          {item.category}
                        </span>
                        <h3 className="text-[11px] sm:text-[20px] font-bold font-headline text-white leading-tight mt-0.5 translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300 delay-75 line-clamp-2">
                          {item.title}
                        </h3>
                        {item.subHeading && (
                          <p className="hidden sm:line-clamp-1 text-[10px] font-semibold text-[#E9D5FF] mt-0.5 translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300 delay-75">
                            {item.subHeading}
                          </p>
                        )}
                        <p className="hidden sm:line-clamp-2 text-xs text-white/85 mt-1 leading-relaxed translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300 delay-100">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2 - Floating Right */}
          <div className="cakezone-marquee-row overflow-hidden py-1.5 -mt-1">
            <div className="cakezone-marquee-track-right gap-2 sm:gap-6 px-2 sm:px-3">
              {[...effectiveRow2, ...effectiveRow2].map((item, idx) => {
                const isLiked = !!likedInspirationIds[item.id];
                return (
                  <div
                    key={`${item.id}-row2-${idx}`}
                    className="group/card relative w-[calc((100vw-24px)/3)] sm:w-[290px] md:w-[310px] h-[145px] sm:h-[330px] md:h-[350px] shrink-0 rounded-[14px] sm:rounded-[24px] bg-white p-1 sm:p-2 shadow-[0_10px_28px_-8px_rgba(20,13,38,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(104,65,184,0.26)] border border-[#EDE5DA] transition-all duration-500 hover:-translate-y-1.5 select-none"
                  >
                    <div className="relative w-full h-full rounded-[10px] sm:rounded-[18px] overflow-hidden bg-[#F3ECE2]">
                      <img
                        src={item.image}
                        alt={item.title}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== window.location.origin + item.fallbackImage) {
                            target.src = item.fallbackImage;
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                        loading="lazy"
                        decoding="async"
                      />

                      {/* Top-Left Category Badge */}
                      <span className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 z-20 px-1.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/92 backdrop-blur-md text-[#1A1412] text-[7px] sm:text-[10px] font-extrabold tracking-[0.06em] sm:tracking-[0.08em] uppercase shadow-xs truncate max-w-[68%]">
                        {item.category}
                      </span>

                      {/* Top-Right Heart Button */}
                      <button
                        type="button"
                        aria-label={`Save ${item.title} to favorites`}
                        onClick={(e) => toggleInspirationLike(item.id, e)}
                        className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-20 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-white/92 backdrop-blur-md flex items-center justify-center shadow-xs transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <svg
                          className={`w-2.5 h-2.5 sm:w-4 sm:h-4 transition-colors duration-200 ${
                            isLiked ? 'text-[#EC4899] fill-[#EC4899]' : 'text-[#5C534E] fill-[#5C534E]/80'
                          }`}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                          />
                        </svg>
                      </button>

                      {/* Hover Overlay with Kicker, Title, Sub-Heading & Description */}
                      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#120924]/95 via-[#120924]/65 to-transparent opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-2 sm:p-5">
                        <span className="text-[7px] sm:text-[10px] font-extrabold tracking-[0.12em] sm:tracking-[0.14em] uppercase text-[#C084FC] translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300">
                          {item.category}
                        </span>
                        <h3 className="text-[11px] sm:text-[20px] font-bold font-headline text-white leading-tight mt-0.5 translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300 delay-75 line-clamp-2">
                          {item.title}
                        </h3>
                        {item.subHeading && (
                          <p className="hidden sm:line-clamp-1 text-[10px] font-semibold text-[#E9D5FF] mt-0.5 translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300 delay-75">
                            {item.subHeading}
                          </p>
                        )}
                        <p className="hidden sm:line-clamp-2 text-xs text-white/85 mt-1 leading-relaxed translate-y-2 group-hover/card:translate-y-0 transition-transform duration-300 delay-100">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inline Admin Supabase Gallery Studio (Create, Upload Cake Image, Update, Delete) */}
        {isAdmin && isGalleryAdminOpen && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
            <div className="bg-white rounded-2xl border border-[#EDE5DA] shadow-lg p-5 sm:p-6 space-y-6">
              {/* 1. Section Header Settings */}
              <form
                onSubmit={handleSaveGalleryHeader}
                className="pb-5 border-b border-[#EDE5DA] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6841B8]">
                      Supabase Table: gallery_settings (user_id = auth.uid())
                    </span>
                    <h3 className="text-base font-bold text-[#140D26]">
                      1. Edit Gallery Heading, Sub-Heading &amp; Description
                    </h3>
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingSection}
                    className="px-4 py-2 rounded-xl bg-[#6841B8] text-white text-xs font-bold hover:bg-[#56339D] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSection ? 'Saving...' : 'Save Section Header'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Main Heading
                    </label>
                    <input
                      type="text"
                      value={sectionDraft.heading}
                      onChange={(e) =>
                        setSectionDraft((prev) => ({ ...prev, heading: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs text-[#1A1412]"
                      placeholder="Explore Our Design"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Highlighted Sub-Heading
                    </label>
                    <input
                      type="text"
                      value={sectionDraft.subHeading}
                      onChange={(e) =>
                        setSectionDraft((prev) => ({ ...prev, subHeading: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs text-[#6841B8] font-bold"
                      placeholder="Inspiration"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Section Description
                    </label>
                    <input
                      type="text"
                      value={sectionDraft.description}
                      onChange={(e) =>
                        setSectionDraft((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs text-[#1A1412]"
                      placeholder="Browse our handcrafted cake concepts..."
                    />
                  </div>
                </div>
              </form>

              {/* 2. Create New Gallery Item + Upload Cake Image */}
              <form
                onSubmit={handleCreateGalleryItem}
                className="pb-5 border-b border-[#EDE5DA] space-y-4"
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#6841B8]">
                    Supabase Table: gallery_items + Storage Bucket: app-files
                  </span>
                  <h3 className="text-base font-bold text-[#140D26]">
                    2. Create New Gallery Item &amp; Upload Cake Image
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Item Heading / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Royal Pistachio Rose"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Sub-Heading / Signature Notes
                    </label>
                    <input
                      type="text"
                      value={newSubHeading}
                      onChange={(e) => setNewSubHeading(e.target.value)}
                      placeholder="e.g. Iranian Pistachio · Rosewater Chantilly"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Type / Category Badge *
                    </label>
                    <input
                      type="text"
                      required
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g. BESPOKE ROYAL"
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Marquee Row
                    </label>
                    <select
                      value={newRowNumber}
                      onChange={(e) => setNewRowNumber(Number(e.target.value) === 2 ? 2 : 1)}
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs"
                    >
                      <option value={1}>Row 1 (Floating Left)</option>
                      <option value={2}>Row 2 (Floating Right)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#1A1412]">
                      Upload Cake Image (Supabase Storage) or Paste URL
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-[#F3E8FF] text-[#6841B8] text-xs font-bold cursor-pointer hover:bg-[#E9D5FF] transition-colors shrink-0 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">cloud_upload</span>
                        <span>Upload Cake Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setNewImageFile(file);
                            setNewImagePreview(URL.createObjectURL(file));
                          }}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Or paste cake image URL..."
                        className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs"
                      />
                    </div>
                    {(newImagePreview || newImageUrl) && (
                      <div className="flex items-center gap-2 pt-1">
                        <img
                          src={newImagePreview || newImageUrl}
                          alt="Preview"
                          className="w-10 h-10 rounded-lg object-cover border border-[#E4DDD3]"
                        />
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          {newImageFile
                            ? `Ready to upload "${newImageFile.name}"`
                            : 'Using image URL'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1A1412] mb-1">
                      Description *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Describe the cake concept, tiers, finish, and artistic inspiration..."
                      className="w-full px-3 py-2 rounded-xl border border-[#E4DDD3] text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isCreatingGalleryItem}
                    className="px-5 py-2.5 rounded-xl bg-[#4E2F21] text-white text-xs font-bold hover:bg-[#3B2217] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add_photo_alternate</span>
                    <span>
                      {isCreatingGalleryItem
                        ? 'Uploading & Saving...'
                        : 'Create Gallery Item in Supabase'}
                    </span>
                  </button>
                </div>
              </form>

              {/* 3. Update & Delete Existing Gallery Items */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-[#140D26]">
                  3. Update or Delete Gallery Items ({activeGalleryItems.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeGalleryItems.map((item) => {
                    const isEditing = editingGalleryId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#EDE5DA] bg-[#FCF9F5] p-2.5 flex flex-col justify-between gap-2"
                      >
                        <div>
                          <div className="relative rounded-lg overflow-hidden aspect-[1.25/1] bg-[#F3ECE2]">
                            <img
                              src={
                                isEditing && editGalleryPreview ? editGalleryPreview : item.image
                              }
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/75 text-white text-[9px] font-bold uppercase">
                              {item.category}
                            </span>
                            <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#6841B8] text-white text-[9px] font-bold">
                              Row {item.rowNumber}
                            </span>
                          </div>

                          <div className="pt-2 space-y-1.5">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editGalleryDraft.title}
                                  onChange={(e) =>
                                    setEditGalleryDraft((d) => ({ ...d, title: e.target.value }))
                                  }
                                  className="w-full px-2 py-1 rounded border border-[#E4DDD3] text-xs font-bold bg-white"
                                  placeholder="Heading / Title"
                                />
                                <input
                                  type="text"
                                  value={editGalleryDraft.subHeading}
                                  onChange={(e) =>
                                    setEditGalleryDraft((d) => ({
                                      ...d,
                                      subHeading: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 rounded border border-[#E4DDD3] text-[11px] bg-white"
                                  placeholder="Sub-heading"
                                />
                                <div className="grid grid-cols-2 gap-1">
                                  <input
                                    type="text"
                                    value={editGalleryDraft.category}
                                    onChange={(e) =>
                                      setEditGalleryDraft((d) => ({
                                        ...d,
                                        category: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded border border-[#E4DDD3] text-[10px] uppercase bg-white"
                                    placeholder="Type"
                                  />
                                  <select
                                    value={editGalleryDraft.rowNumber}
                                    onChange={(e) =>
                                      setEditGalleryDraft((d) => ({
                                        ...d,
                                        rowNumber: Number(e.target.value) === 2 ? 2 : 1,
                                      }))
                                    }
                                    className="w-full px-2 py-1 rounded border border-[#E4DDD3] text-[10px] bg-white"
                                  >
                                    <option value={1}>Row 1</option>
                                    <option value={2}>Row 2</option>
                                  </select>
                                </div>
                                <textarea
                                  rows={2}
                                  value={editGalleryDraft.description}
                                  onChange={(e) =>
                                    setEditGalleryDraft((d) => ({
                                      ...d,
                                      description: e.target.value,
                                    }))
                                  }
                                  className="w-full px-2 py-1 rounded border border-[#E4DDD3] text-[11px] bg-white"
                                />
                                <label className="block px-2 py-1 rounded bg-[#F3E8FF] text-[#6841B8] text-[10px] font-bold text-center cursor-pointer">
                                  Replace Cake Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      setEditGalleryFile(f);
                                      setEditGalleryPreview(URL.createObjectURL(f));
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </>
                            ) : (
                              <>
                                <h4 className="font-bold text-xs text-[#1A1412] line-clamp-1">
                                  {item.title}
                                </h4>
                                {item.subHeading && (
                                  <p className="text-[10px] text-[#6841B8] font-medium line-clamp-1">
                                    {item.subHeading}
                                  </p>
                                )}
                                <p className="text-[11px] text-[#5C534E] line-clamp-2">
                                  {item.description}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#EDE5DA] flex justify-between items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                disabled={isUpdatingGalleryItem}
                                onClick={() => handleSaveEditGalleryItem(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-[#6841B8] text-white text-xs font-bold cursor-pointer"
                              >
                                {isUpdatingGalleryItem ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingGalleryId(null)}
                                className="px-2.5 py-1 rounded-lg border border-[#E4DDD3] text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEditGalleryItem(item)}
                                className="px-2.5 py-1 rounded-lg bg-[#F3E8FF] text-[#6841B8] text-xs font-bold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingGalleryId === item.id}
                                onClick={() => handleDeleteGalleryItem(item)}
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                {deletingGalleryId === item.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Our Craft / Story Section */}
      <section
        className="scroll-mt-20 sm:scroll-mt-24 pt-8 pb-12 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20 overflow-hidden"
        id="about"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-14">
          {/* Feature 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="space-y-4">
              <span className="text-primary font-bold text-xs sm:text-sm tracking-widest uppercase">
                UNCOMPROMISING QUALITY
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-on-surface leading-tight">
                Premium Ingredients, Freshly Crafted for You
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-sm sm:text-base">
                Every cake begins with carefully selected ingredients, from rich Indian dairy and
                farm-fresh milk to premium chocolates, fresh seasonal fruits, and aromatic natural
                flavours. We bring together quality ingredients, authentic taste, and expert
                craftsmanship to create delightful experiences in every bite.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-on-surface-variant font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">eco</span>
                  <span>Quality Ingredients</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">verified</span>
                  <span>Freshly Prepared</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="/assets/aistudio/image_337c1866.png"
                alt="A rustic wooden kitchen table neatly arranged with premium baking ingredients"
                className="rounded-2xl shadow-xl object-cover object-center w-full aspect-[16/10] sm:aspect-auto sm:h-[320px] md:h-[350px] bg-surface-container"
                loading="lazy"
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center -mt-2 sm:-mt-4">
            <div className="order-2 md:order-1 relative">
              <img
                src="/assets/aistudio/image_99edbfba.png"
                alt="An expert master pastry chef meticulously piping intricate buttercream flowers"
                className="rounded-2xl shadow-xl object-cover object-center w-full aspect-[16/10] sm:aspect-auto sm:h-[320px] md:h-[350px] bg-surface-container"
                loading="lazy"
              />
            </div>
            <div className="order-1 md:order-2 space-y-4">
              <span className="text-primary font-bold text-xs sm:text-sm tracking-widest uppercase">
                MASTER BAKERS &amp; CAKE ARTISTS
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-on-surface leading-tight">
                Crafted by Passionate Baking Experts
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-sm sm:text-base">
                Our skilled team of bakers and cake artists brings creativity, precision, and
                passion to every creation. From beautifully handcrafted designs to intricate fondant
                decorations, we transform your ideas into delicious masterpieces made to make every
                celebration special.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-on-surface-variant font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">award_star</span>
                  <span>Expert Baking Craftsmanship</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">brush</span>
                  <span>Custom Cake Designs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Cake Builder CTA Banner */}
      <section
        className="scroll-mt-20 sm:scroll-mt-24 py-14 sm:py-20 bg-primary-container text-on-primary-container relative overflow-hidden"
        id="custom-cakes"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-surface/20 backdrop-blur-sm text-on-primary font-label text-xs sm:text-sm font-bold tracking-wide">
            MADE JUST FOR YOU
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-headline mt-5 sm:mt-6 text-on-primary leading-tight">
            Create a Cake as Unique as Your Celebration
          </h2>
          <p className="text-on-primary-container/90 mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-lg leading-relaxed">
            Have a cake design in mind? Customize every detail, from flavours and fillings to
            colours, tiers, and decorations. Share your inspiration and let us turn your dream cake
            into a delicious reality.
          </p>
          <div className="mt-7 sm:mt-8">
            <button
              type="button"
              onClick={() => {
                handleProtectedAction(onOpenConfigurator, 'launch the cake configurator');
              }}
              className="w-full sm:w-auto inline-block px-8 py-4 rounded-xl bg-surface text-primary font-label font-bold shadow-xl hover:bg-surface-bright transition-all transform active:scale-95 cursor-pointer"
            >
              Design Your Custom Cake
            </button>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="scroll-mt-20 sm:scroll-mt-24 py-14 sm:py-24 bg-surface-container-low" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
            <span className="text-primary font-bold text-xs sm:text-sm tracking-widest uppercase">
              TESTIMONIALS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline mt-2 text-on-surface">
              Loved by Connoisseurs Worldwide
            </h2>
            <p className="text-on-surface-variant text-sm sm:text-base mt-3 sm:mt-4">
              Hear what our esteemed clients have to say about their unforgettable CakeZone experiences.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 md:gap-8">
            {REVIEWS.map((review, index) => (
              <div
                key={review.id}
                className={`bg-surface p-3.5 sm:p-6 md:p-8 rounded-2xl shadow-xs border border-outline-variant/30 flex-col justify-between min-w-0 ${
                  index >= 2 ? 'hidden md:flex' : 'flex'
                }`}
              >
                <div>
                  <div className="flex text-tertiary gap-0.5 sm:gap-1 mb-2.5 sm:mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <span
                        key={i}
                        className="material-symbols-outlined text-amber-500 text-base sm:text-xl leading-none"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-on-surface-variant italic leading-relaxed text-xs sm:text-sm">
                    {review.quote}
                  </p>
                </div>
                <div className="mt-4 sm:mt-6 flex items-center gap-2.5 sm:gap-4 pt-3 sm:pt-4 border-t border-outline-variant">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary-container flex items-center justify-center font-bold text-on-secondary-container text-xs sm:text-sm shrink-0">
                    {review.initials}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-on-surface text-xs sm:text-sm truncate">{review.author}</h4>
                    <p className="text-[10px] sm:text-xs text-on-surface-variant truncate">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative bg-[#060408] text-slate-300 w-full overflow-hidden border-t border-pink-500/20"
        id="contact"
      >
        {/* Ambient Glowing Silk Waves & Bokeh (Pure CSS & SVG, no ghost text artifacts) */}
        {/* Top-Left Silk Wave */}
        <div className="absolute -top-10 -left-10 w-72 h-40 pointer-events-none select-none overflow-hidden">
          <svg className="w-full h-full opacity-80" viewBox="0 0 280 160" fill="none">
            <path
              d="M-20 0C60 40 140 10 240 100C290 145 220 180 160 160C100 140 20 60 -20 80Z"
              fill="url(#pinkWaveGradTL)"
            />
            <defs>
              <linearGradient id="pinkWaveGradTL" x1="0" y1="0" x2="240" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff2d55" stopOpacity="0.8" />
                <stop offset="0.5" stopColor="#e11d48" stopOpacity="0.4" />
                <stop offset="1" stopColor="#ff2d55" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="absolute top-0 left-0 w-64 h-32 bg-pink-600/15 blur-2xl pointer-events-none" />

        {/* Bottom-Left Silk Wave */}
        <div className="absolute -bottom-10 -left-10 w-80 h-44 pointer-events-none select-none overflow-hidden">
          <svg className="w-full h-full opacity-75" viewBox="0 0 320 180" fill="none">
            <path
              d="M-20 180C60 120 160 150 260 80C310 45 270 10 200 40C130 70 30 140 -20 110Z"
              fill="url(#pinkWaveGradBL)"
            />
            <defs>
              <linearGradient id="pinkWaveGradBL" x1="0" y1="180" x2="280" y2="60" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff2d55" stopOpacity="0.75" />
                <stop offset="0.6" stopColor="#f43f5e" stopOpacity="0.35" />
                <stop offset="1" stopColor="#ff2d55" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-72 h-32 bg-pink-600/15 blur-2xl pointer-events-none" />

        <div className="absolute top-0 right-16 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Right side artisanal cake showcase (desktop) */}
        <div className="absolute top-0 right-0 bottom-0 w-[280px] xl:w-[340px] 2xl:w-[400px] pointer-events-none hidden xl:block overflow-hidden select-none">
          <img
            src="/assets/footer_cake_right.png"
            alt="CakeZone Artisanal Cake"
            className="w-full h-full object-cover object-left opacity-90"
          />
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#060408] via-[#060408]/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#060408] to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-14 pb-6">
          {/* Main Footer 4-Column Grid with vertical pink hairline dividers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-0 pb-10">
            {/* Column 1: Brand & Socials */}
            <div className="lg:col-span-4 lg:pr-8 lg:border-r lg:border-pink-500/20 space-y-4 text-left">
              <div className="flex items-center gap-3.5">
                {/* Circular Gold/Pink Framed Badge */}
                <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-br from-[#ffd700] via-[#ff2d55] to-[#ffd700] shrink-0 shadow-lg shadow-pink-950/40">
                  <img
                    src="/assets/aistudio/cropped_circle_image_7d4789a4.png"
                    alt="CakeZone Logo"
                    className="w-full h-full rounded-full object-cover bg-black"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = LOGO_URL;
                    }}
                  />
                </div>

                {/* Thin vertical separator */}
                <div className="h-10 w-[1.5px] bg-white/20 shrink-0" />

                {/* Brand Title and Tagline */}
                <div className="min-w-0">
                  <div className="text-2xl sm:text-[28px] font-black tracking-tight font-headline text-white leading-none">
                    Cake<span className="text-[#ff2d55]">Zone</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-slate-300 uppercase block leading-tight font-sans">
                      SWEET MOMENTS, ALWAYS
                    </span>
                    {/* Pink curve accent line underneath */}
                    <div className="w-20 h-[2px] bg-gradient-to-r from-[#ff2d55] via-pink-400 to-transparent rounded-full mt-1" />
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-[13px] text-slate-300/90 leading-relaxed max-w-sm font-sans">
                Your trusted boutique for handcrafted cakes, bespoke custom creations, and 100% eggless deliciousness since 2020.
              </p>

              {/* Social Logo Badges (Instagram & WhatsApp) */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://www.instagram.com/the_cake_zone_00/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                  title="Instagram: @the_cake_zone_00"
                  aria-label="Instagram"
                >
                  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://wa.me/919399736018"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                  title="WhatsApp: +91 93997 36018"
                  aria-label="WhatsApp"
                >
                  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div className="lg:col-span-2 lg:px-6 lg:border-r lg:border-pink-500/20 space-y-4 text-left">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff2d55] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 19h18v-5l-9-5-9 5v5z" />
                    <path d="M3 14h18" />
                    <path d="M12 9V4" />
                    <circle cx="12" cy="3" r="1.25" fill="#ff2d55" stroke="none" />
                  </svg>
                  <h3 className="text-sm font-bold text-white tracking-tight font-headline">
                    Quick Links
                  </h3>
                </div>
                <div className="w-8 h-[2px] bg-[#ff2d55] rounded-full mt-1.5" />
              </div>

              <ul className="space-y-2.5 text-xs sm:text-[13px]">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('home');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      else window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Home</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('collections');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Collections</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('inspiration-gallery');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Gallery</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('about');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>About</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenConfigurator()}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Custom Cake</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('testimonials');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Testimonial</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Information & Policies */}
            <div className="lg:col-span-3 lg:px-6 lg:border-r lg:border-pink-500/20 space-y-4 text-left">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff2d55] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  <h3 className="text-sm font-bold text-white tracking-tight font-headline">
                    Information & Policies
                  </h3>
                </div>
                <div className="w-8 h-[2px] bg-[#ff2d55] rounded-full mt-1.5" />
              </div>

              <ul className="space-y-2.5 text-xs sm:text-[13px]">
                <li>
                  <button
                    type="button"
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                    onClick={() => setActivePolicyModal('privacy')}
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Privacy Policy</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                    onClick={() => setActivePolicyModal('terms')}
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Terms of Service</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                    onClick={() => setActivePolicyModal('faq')}
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Frequently Asked Questions</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-slate-300 hover:text-white transition-colors cursor-pointer text-left font-medium flex items-center group"
                    onClick={() => setActivePolicyModal('shipping')}
                  >
                    <span className="text-[#ff2d55] font-bold text-sm mr-2 transition-transform group-hover:translate-x-0.5">›</span>
                    <span>Shipping & Delivery Info</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Get In Touch */}
            <div className="lg:col-span-3 lg:pl-6 space-y-4 text-left">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#ff2d55] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                  <h3 className="text-sm font-bold text-white tracking-tight font-headline">
                    Get In Touch
                  </h3>
                </div>
                <div className="w-8 h-[2px] bg-[#ff2d55] rounded-full mt-1.5" />
              </div>

              <div className="space-y-3 pt-1 text-xs sm:text-[13px]">
                {/* Location */}
                <a
                  href="https://www.google.com/maps/search/?api=1&query=2488+Behind+dr+taqi+raza+ghantaghar+jabalpur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2.5 text-slate-300 hover:text-white transition-colors"
                  title="View on Google Maps"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1e0e18] border border-pink-500/30 flex items-center justify-center shrink-0 text-[#ff2d55] group-hover:scale-110 group-hover:border-[#ff2d55] transition-all mt-0.5">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                  <span className="leading-snug">
                    2488 Behind dr taqi raza ghantaghar jabalpur
                  </span>
                </a>

                {/* Phone */}
                <a
                  href="tel:+919399736018"
                  className="group flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors font-medium"
                  title="Call +91 93997 36018"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1e0e18] border border-pink-500/30 flex items-center justify-center shrink-0 text-[#ff2d55] group-hover:scale-110 group-hover:border-[#ff2d55] transition-all">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  </div>
                  <span>+91 93997 36018</span>
                </a>

                {/* Email */}
                <a
                  href="mailto:thecakezone00@gmail.com"
                  className="group flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors"
                  title="Email CakeZone"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1e0e18] border border-pink-500/30 flex items-center justify-center shrink-0 text-[#ff2d55] group-hover:scale-110 group-hover:border-[#ff2d55] transition-all">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <span>thecakezone00@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Made with Love */}
          <div className="border-t border-pink-500/25 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-center sm:text-left text-xs">
            <div className="text-slate-400 font-sans">
              ⓒ 2027 <strong className="text-[#ff2d55] font-bold">CakeZone</strong>. All rights reserved. Handcrafted Eggless Creations.
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="h-3 w-[1px] bg-slate-700 hidden sm:inline-block" />
              <span className="text-[#ff2d55] text-sm">♥</span>
              <span className="italic text-slate-300 font-sans">Made with Love in Jabalpur</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Small Window Modal for Terms of Service, Privacy Policy, FAQ & Shipping Info */}
      {activePolicyModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActivePolicyModal(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface-container-lowest max-w-md w-full p-5 sm:p-6 rounded-2xl shadow-2xl border border-outline-variant space-y-4"
          >
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                <strong>
                  {activePolicyModal === 'terms'
                    ? 'Terms of Service'
                    : activePolicyModal === 'privacy'
                    ? 'Privacy Policy'
                    : activePolicyModal === 'faq'
                    ? 'Frequently Asked Questions'
                    : 'Shipping & Delivery Information'}
                </strong>
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto pr-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-2">
              {activePolicyModal === 'terms' && (
                <p>
                  By accessing and using the CakeZone website, you agree to our terms and conditions. Customers must provide accurate information when placing orders for cakes, bakery products, or custom cake designs. All orders are subject to product availability, price confirmation, and acceptance by CakeZone. Product appearance may vary slightly from displayed images. We offer home delivery and store pickup where available, subject to confirmation. Customers should contact us promptly for order cancellations, modifications, refunds, or complaints, as eligibility may depend on the order status and applicable policies. Customers are responsible for checking their order details, delivery information, and customization requests before confirmation. All website content, branding, images, and designs are protected by applicable intellectual property laws. CakeZone reserves the right to update website content and these terms as necessary. Use of the website is also subject to our Privacy Policy and applicable laws of India. For assistance, please contact CakeZone through our official support channels.
                </p>
              )}
              {activePolicyModal === 'privacy' && (
                <p>
                  At CakeZone, we respect your privacy and are committed to protecting your personal information. We may collect details such as your name, phone number, email address, delivery address, and order preferences to process cake orders, manage custom cake requests, arrange home delivery or store pickup, and provide customer support. If you place an order through WhatsApp or use third-party payment services, relevant information may be processed by those platforms under their respective privacy policies. We use reasonable security measures to protect your information and do not sell personal data as a business practice. Your information may be shared with trusted service providers when necessary to fulfil orders or comply with legal obligations. We retain personal information only as long as reasonably necessary for business and legal purposes. Subject to applicable law, you may request access to, correction of, or deletion of your personal information by contacting CakeZone through our official support channels. By using our website, you acknowledge this Privacy Policy and its terms, subject to any consent required by applicable Indian law.
                </p>
              )}
              {activePolicyModal === 'faq' && (
                <p>
                  We deliver freshly prepared cakes in temperature-controlled luxury packaging across the city. Custom cake orders can be personalized with your preferred flavours, fillings, tiers, and dietary preferences (including 100% eggless options).
                </p>
              )}
              {activePolicyModal === 'shipping' && (
                <p>
                  Same-day chilled courier delivery is available for signature creations ordered before 11:00 AM. Bespoke and multi-tier custom cake designs are recommended to be booked at least 24 hours in advance.
                </p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="w-full py-2.5 bg-primary text-on-primary text-xs sm:text-sm font-bold rounded-xl cursor-pointer hover:bg-primary/90 transition-all shadow-sm"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
