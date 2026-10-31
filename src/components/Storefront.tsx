import React, { useState, useEffect } from 'react';
import { CakeProduct, GalleryItem, GallerySectionSettings } from '../types';
import {
  HERO_CAKE_URL,
  INGREDIENTS_IMAGE_URL,
  CHEFS_IMAGE_URL,
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

interface StorefrontProps {
  cakes?: CakeProduct[];
  galleryItems?: GalleryItem[];
  onGalleryItemsChange?: (items: GalleryItem[]) => void;
  gallerySettings?: GallerySectionSettings;
  onGallerySettingsChange?: (settings: GallerySectionSettings) => void;
  isAdmin?: boolean;
  onShowToast?: (msg: string) => void;
  onQuickView: (cake: CakeProduct) => void;
  onOrderNow: (cake: CakeProduct) => void;
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
  onOpenConfigurator,
  userName,
  onUpdateUserName,
  isLoggedIn,
  onRequireAuth,
}) => {
  const [localName, setLocalName] = useState(userName || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePolicyModal, setActivePolicyModal] = useState<'terms' | 'privacy' | null>(null);
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

  const filteredCakes =
    selectedCategory === 'All'
      ? catalogCakes
      : catalogCakes.filter(
          (cake) =>
            cake.category === selectedCategory || cake.tags.includes(selectedCategory)
        );

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
        {/* Full Hero Video Background with Enhanced Color Vibrancy */}
        <video
          src="/assets/aistudio/kling_20261020_VIDEO_Use_the_up_5466_0_97ab3ed5.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center z-0 filter saturate-[1.15] contrast-[1.03] brightness-[1.02]"
        >
          Your browser does not support the video tag.
        </video>

        {/* Responsive Readability Scrim preserving the pastel blue backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#E6F4FE]/85 via-[#E6F4FE]/65 to-[#E6F4FE]/35 md:bg-gradient-to-r md:from-[#E6F4FE]/45 md:via-[#E6F4FE]/20 md:to-transparent z-10 pointer-events-none" />

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
              className="text-3xl sm:text-5xl md:text-[62px] font-black font-headline tracking-[-0.03em] text-[#140D26] leading-[1.1] sm:leading-[1.08]"
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

            <p className="text-sm sm:text-[15px] md:text-base text-[#2D3A4A] md:text-[#3E4C5E] leading-[1.65] max-w-[480px] font-normal">
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

          {/* Category Filter Pills (Horizontally scrollable on mobile, wrapped on tablet/desktop) */}
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto sm:flex-wrap pb-2 sm:pb-0 mb-7 sm:mb-9 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`category-glass-shine-btn px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium cursor-pointer shrink-0 whitespace-nowrap ${
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

          {/* Cake Cards Grid */}
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
                Rare &amp; Sustainably Sourced Ingredients
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-sm sm:text-base">
                We travel the globe to source the finest ingredients—from organic Bourbon vanilla
                pods in Madagascar to single-origin cacao from Ecuador. Every element is selected with
                strict adherence to flavor integrity and ethical harvesting.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-on-surface-variant font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">eco</span>
                  <span>100% Organic Flours</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">verified</span>
                  <span>Pure French Butter</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src={INGREDIENTS_IMAGE_URL}
                alt="A rustic wooden kitchen table neatly arranged with premium baking ingredients"
                className="rounded-2xl shadow-xl object-cover w-full h-[240px] sm:h-[320px] md:h-[350px] bg-surface-container"
                loading="lazy"
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center -mt-2 sm:-mt-4">
            <div className="order-2 md:order-1 relative">
              <img
                src={CHEFS_IMAGE_URL}
                alt="An expert master pastry chef meticulously piping intricate buttercream flowers"
                className="rounded-2xl shadow-xl object-cover w-full h-[240px] sm:h-[320px] md:h-[350px] bg-surface-container"
                loading="lazy"
              />
            </div>
            <div className="order-1 md:order-2 space-y-4">
              <span className="text-primary font-bold text-xs sm:text-sm tracking-widest uppercase">
                MASTER ARTISANS
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-headline text-on-surface leading-tight">
                Sculpted by World-Class Pastry Chefs
              </h2>
              <p className="text-on-surface-variant leading-relaxed text-sm sm:text-base">
                Our brigade of master bakers and sugar artists combine classical French patisserie
                techniques with avant-garde modern design, turning edible treats into breathtaking
                contemporary sculptures.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-on-surface-variant font-medium">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">award_star</span>
                  <span>Parisian Culinary Guild</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">brush</span>
                  <span>Bespoke Sugar Sculpting</span>
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
            BESPOKE EXPERIENCE
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black font-headline mt-5 sm:mt-6 text-on-primary leading-tight">
            Design Your Dream Custom Cake
          </h2>
          <p className="text-on-primary-container/90 mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-lg leading-relaxed">
            Have a unique vision? Use our interactive configurator to select tiers, custom fillings,
            color palettes, and bespoke sugar artistry for your special event.
          </p>
          <div className="mt-7 sm:mt-8">
            <button
              type="button"
              onClick={() => {
                handleProtectedAction(onOpenConfigurator, 'launch the cake configurator');
              }}
              className="w-full sm:w-auto inline-block px-8 py-4 rounded-xl bg-surface text-primary font-label font-bold shadow-xl hover:bg-surface-bright transition-all transform active:scale-95 cursor-pointer"
            >
              Launch Cake Configurator
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
        className="bg-surface-container-low dark:bg-surface-container w-full border-t border-outline-variant"
        id="contact"
      >
        <div className="flex flex-col md:flex-row justify-between items-center px-4 sm:px-6 py-8 max-w-7xl mx-auto gap-5 sm:gap-6 text-center md:text-left">
          <div className="text-lg font-bold text-primary font-headline">CakeZone</div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-label">
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setActivePolicyModal('privacy');
              }}
              href="#privacy"
            >
              Privacy Policy
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                setActivePolicyModal('terms');
              }}
              href="#terms"
            >
              Terms of Service
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                alert('FAQ: We deliver refrigerated in temperature-controlled luxury packaging across the metropolitan area.');
              }}
              href="#faq"
            >
              FAQ
            </a>
            <a
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                alert('Shipping Info: Same-day delivery for signature creations ordered before 11 AM.');
              }}
              href="#shipping"
            >
              Shipping Info
            </a>
          </div>
          <div className="text-xs sm:text-sm text-on-surface-variant">
            © 2027 CakeZone. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Small Window Modal for Terms of Service & Privacy Policy */}
      {activePolicyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-surface-container-lowest max-w-md w-full p-5 sm:p-6 rounded-2xl shadow-2xl border border-outline-variant space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                <strong>
                  {activePolicyModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
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
              {activePolicyModal === 'terms' ? (
                <p>
                  By accessing and using the CakeZone website, you agree to our terms and conditions. Customers must provide accurate information when placing orders for cakes, bakery products, or custom cake designs. All orders are subject to product availability, price confirmation, and acceptance by CakeZone. Product appearance may vary slightly from displayed images. We offer home delivery and store pickup where available, subject to confirmation. Customers should contact us promptly for order cancellations, modifications, refunds, or complaints, as eligibility may depend on the order status and applicable policies. Customers are responsible for checking their order details, delivery information, and customization requests before confirmation. All website content, branding, images, and designs are protected by applicable intellectual property laws. CakeZone reserves the right to update website content and these terms as necessary. Use of the website is also subject to our Privacy Policy and applicable laws of India. For assistance, please contact CakeZone through our official support channels.
                </p>
              ) : (
                <p>
                  At CakeZone, we respect your privacy and are committed to protecting your personal information. We may collect details such as your name, phone number, email address, delivery address, and order preferences to process cake orders, manage custom cake requests, arrange home delivery or store pickup, and provide customer support. If you place an order through WhatsApp or use third-party payment services, relevant information may be processed by those platforms under their respective privacy policies. We use reasonable security measures to protect your information and do not sell personal data as a business practice. Your information may be shared with trusted service providers when necessary to fulfil orders or comply with legal obligations. We retain personal information only as long as reasonably necessary for business and legal purposes. Subject to applicable law, you may request access to, correction of, or deletion of your personal information by contacting CakeZone through our official support channels. By using our website, you acknowledge this Privacy Policy and its terms, subject to any consent required by applicable Indian law.
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
