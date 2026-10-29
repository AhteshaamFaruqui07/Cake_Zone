import React, { useState, useEffect } from 'react';
import { CakeProduct } from '../types';
import {
  HERO_CAKE_URL,
  INGREDIENTS_IMAGE_URL,
  CHEFS_IMAGE_URL,
  SIGNATURE_CAKES,
  REVIEWS,
} from '../data/initialData';

interface StorefrontProps {
  cakes?: CakeProduct[];
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
          <div className="flex flex-col items-start gap-4 sm:gap-5 max-w-xl">
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
                    document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
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
                      <stop offset="0%" stopColor="#6841B8" stopOpacity="0.9" />
                      <stop offset="45%" stopColor="#B899F6" stopOpacity="0.65" />
                      <stop offset="80%" stopColor="#F4B2D0" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#E7C365" stopOpacity="0.45" />
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
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-full bg-white/90 backdrop-blur-md text-[#51328F] text-sm font-bold border border-[#8B72BE]/60 hover:bg-white transition-all transform active:scale-95 shadow-xs cursor-pointer w-full sm:w-auto"
              >
                Design Custom Cake
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Collections Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-[#FBF7F2]" id="collections">
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
                  className={`px-5 sm:px-7 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#4E2F21] text-white border border-[#4E2F21] shadow-xs'
                      : 'bg-[#FAF6F0] text-[#2D2420] border border-[#E4DDD3] hover:border-[#4E2F21]/40 hover:bg-[#F3ECE2]'
                  }`}
                >
                  {category}
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

      {/* Our Craft / Story Section */}
      <section className="py-14 sm:py-20 md:py-24 overflow-hidden" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14 sm:space-y-24">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
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
        className="py-14 sm:py-20 bg-primary-container text-on-primary-container relative overflow-hidden"
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
      <section className="py-14 sm:py-24 bg-surface-container-low" id="testimonials">
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
