import React, { useState, useEffect, useRef } from 'react';
import { ScreenType } from '../types';
import { LOGO_URL } from '../data/initialData';

interface NavbarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  cartCount: number;
  onOpenCart: () => void;
  user: { name: string; role: string; initials: string } | null;
  onLogout?: () => void;
  onRequireAuth?: (actionName?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  cartCount,
  onOpenCart,
  user,
  onLogout,
  onRequireAuth,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 88,
    opacity: 1,
  });
  const [isPillMorphing, setIsPillMorphing] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const navItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const prevTargetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleCartBounce = () => {
      setIsCartBouncing(true);
      setTimeout(() => setIsCartBouncing(false), 700);
    };

    window.addEventListener('cakezone:cart-bounce', handleCartBounce);
    return () => window.removeEventListener('cakezone:cart-bounce', handleCartBounce);
  }, []);

  useEffect(() => {
    if (currentScreen !== 'storefront') return;

    const sectionIds = ['collections', 'inspiration-gallery', 'about', 'custom-cakes', 'testimonials'];
    const handleScroll = () => {
      const headerHeight = headerRef.current?.offsetHeight || 72;
      const scrollPosition = window.scrollY + headerHeight + 80;

      if (window.scrollY < 200) {
        setActiveSection('home');
        return;
      }

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          return;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentScreen]);

  useEffect(() => {
    if (!isMobileMenuOpen && !isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen, isDropdownOpen]);

  const handleProtectedNav = (action: () => void, actionName: string) => {
    setIsMobileMenuOpen(false);
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth(actionName);
      } else {
        onNavigate('signin');
      }
      return;
    }
    action();
  };

  const scrollToSection = (sectionId: string, actionLabel: string) => {
    handleProtectedNav(() => {
      setActiveSection(sectionId);
      onNavigate('storefront');
      setTimeout(() => {
        const targetEl = document.getElementById(sectionId);
        if (targetEl) {
          const headerHeight = headerRef.current?.offsetHeight || 72;
          const elementTop = targetEl.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: Math.max(0, elementTop - headerHeight - 8),
            behavior: 'smooth',
          });
        }
      }, 60);
    }, actionLabel);
  };

  const activeNavId = currentScreen === 'storefront' ? activeSection : '';
  const targetNavId = hoveredNavId ?? activeNavId;

  useEffect(() => {
    const updatePill = () => {
      const btn = targetNavId ? navItemRefs.current[targetNavId] : null;
      if (btn && btn.offsetWidth > 0) {
        setPillStyle({
          left: btn.offsetLeft,
          width: btn.offsetWidth,
          opacity: 1,
        });
      } else {
        setPillStyle((prev) => ({
          ...prev,
          opacity: 0,
        }));
      }
    };

    updatePill();

    let morphTimer: ReturnType<typeof setTimeout> | undefined;
    if (prevTargetIdRef.current && prevTargetIdRef.current !== targetNavId) {
      setIsPillMorphing(true);
      morphTimer = setTimeout(() => setIsPillMorphing(false), 240);
    }
    prevTargetIdRef.current = targetNavId;

    window.addEventListener('resize', updatePill);
    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && navRef.current) {
      observer = new ResizeObserver(updatePill);
      observer.observe(navRef.current);
    }
    if (typeof document !== 'undefined' && 'fonts' in document) {
      (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready
        .then(updatePill)
        .catch(() => {});
    }

    return () => {
      if (morphTimer) clearTimeout(morphTimer);
      window.removeEventListener('resize', updatePill);
      observer?.disconnect();
    };
  }, [targetNavId, user, currentScreen]);

  return (
    <header
      ref={headerRef}
      className={`${
        currentScreen === 'storefront' ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
      } z-50 w-full px-2.5 sm:px-4 lg:px-6 pt-2 sm:pt-3 pb-1 bg-transparent pointer-events-none`}
    >
      {/* Main Top Nav Bar — Crystal Clear Apple Liquid Glass Floating Capsule */}
      <div
        className="pointer-events-auto relative flex justify-between items-center gap-1 lg:gap-2 px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 max-w-6xl mx-auto rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.10)_50%,rgba(255,255,255,0.18)_100%)] backdrop-blur-[20px] backdrop-saturate-[170%] border border-white/60 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14),0_2px_10px_rgba(15,23,42,0.06),inset_0_1.5px_1.5px_rgba(255,255,255,0.82),inset_0_-1px_2px_rgba(255,255,255,0.28)] transition-all duration-300 overflow-visible"
      >
        {/* Seamless Specular Clear Glass Rim Highlight */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.08)_38%,rgba(255,255,255,0)_60%)]"
        />

        {/* Brand / Logo Zone */}
        <button
          type="button"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setActiveSection('home');
            onNavigate('storefront');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="relative z-10 flex items-center gap-2 lg:gap-2.5 text-left focus:outline-none group cursor-pointer shrink-0 pl-0.5"
        >
          <img
            src={LOGO_URL}
            alt="CakeZone Logo"
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(false);
              setActiveSection('home');
              onNavigate('storefront');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full object-cover ring-2 ring-white/80 shadow-sm group-hover:scale-105 transition-transform cursor-pointer shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(false);
              setActiveSection('home');
              onNavigate('storefront');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-base md:text-[15px] lg:text-lg font-black text-[#1d1b20] tracking-tight font-headline cursor-pointer whitespace-nowrap drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
          >
            CakeZone
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav
          ref={navRef}
          onMouseLeave={() => setHoveredNavId(null)}
          className="relative z-10 hidden md:flex items-center gap-0 lg:gap-1 bg-transparent border-0 shadow-none"
        >
          {/* Single Continuous Sliding & Morphing Glossy Liquid Pill */}
          <span
            aria-hidden="true"
            style={{
              left: `${pillStyle.left}px`,
              width: `${pillStyle.width}px`,
              opacity: pillStyle.opacity,
              transform: isPillMorphing ? 'scaleX(1.08) scaleY(0.92)' : 'scaleX(1) scaleY(1)',
              transition:
                'left 420ms cubic-bezier(0.32, 1.25, 0.37, 1), width 380ms cubic-bezier(0.32, 1.25, 0.37, 1), transform 240ms ease-out, opacity 200ms ease-out',
            }}
            className="pointer-events-none absolute inset-y-0 rounded-full bg-gradient-to-r from-[#4f378a] via-[#6750a4] to-[#7c3aed] border border-white/40 shadow-[0_6px_18px_-3px_rgba(79,55,138,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)] z-0"
          >
            {/* Top Subtle Specular Highlight Arc */}
            <span className="absolute top-[1.5px] left-2.5 right-2.5 h-[40%] rounded-full bg-gradient-to-b from-white/38 via-white/10 to-transparent" />
          </span>

          {[
            {
              id: 'home',
              label: 'Home',
              icon: 'home',
              isActive: currentScreen === 'storefront' && activeSection === 'home',
              onClick: () => {
                handleProtectedNav(() => {
                  setActiveSection('home');
                  onNavigate('storefront');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 'navigate Home');
              },
            },
            {
              id: 'collections',
              label: 'Collections',
              icon: 'cake',
              isActive: currentScreen === 'storefront' && activeSection === 'collections',
              onClick: () => scrollToSection('collections', 'browse collections'),
            },
            {
              id: 'inspiration-gallery',
              label: 'Gallery',
              icon: 'auto_awesome',
              isActive: currentScreen === 'storefront' && activeSection === 'inspiration-gallery',
              onClick: () => scrollToSection('inspiration-gallery', 'view Gallery section'),
            },
            {
              id: 'about',
              label: 'About',
              icon: 'storefront',
              isActive: currentScreen === 'storefront' && activeSection === 'about',
              onClick: () => scrollToSection('about', 'view About section'),
            },
            {
              id: 'custom-cakes',
              label: 'Custom Cakes',
              icon: 'palette',
              isActive: currentScreen === 'storefront' && activeSection === 'custom-cakes',
              onClick: () => scrollToSection('custom-cakes', 'customize cakes'),
            },
            {
              id: 'testimonials',
              label: 'Testimonial',
              icon: 'verified',
              isActive: currentScreen === 'storefront' && activeSection === 'testimonials',
              onClick: () => scrollToSection('testimonials', 'view testimonials'),
            },
          ].map((item) => {
            const isHighlighted = targetNavId === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  navItemRefs.current[item.id] = el;
                }}
                type="button"
                onMouseEnter={() => setHoveredNavId(item.id)}
                onFocus={() => setHoveredNavId(item.id)}
                onClick={item.onClick}
                className={`group relative z-10 px-1.5 lg:px-2.5 xl:px-3 py-1.5 rounded-full border-0 outline-none text-[11px] lg:text-[13px] font-label cursor-pointer whitespace-nowrap focus:outline-none flex items-center gap-1 lg:gap-1.5 transition-all duration-300 ${
                  isHighlighted
                    ? 'text-white font-extrabold drop-shadow-[0_1px_3px_rgba(34,0,93,0.35)]'
                    : 'text-[#1d1b20]/85 hover:text-[#4f378a] font-semibold'
                }`}
              >
                <span className="hidden xl:inline-flex items-center">
                  <span
                    className={`material-symbols-outlined text-[14px] leading-none transition-transform duration-300 ${
                      isHighlighted ? 'scale-110 text-white' : 'text-[#494551]/85 group-hover:text-[#4f378a]'
                    }`}
                  >
                    {item.icon}
                  </span>
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions (Cart, Profile, Mobile Menu Button) */}
        <div className="relative z-10 flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Shopping Bag Button */}
          <button
            id="navbar-cart-button"
            type="button"
            onClick={() => {
              handleProtectedNav(onOpenCart, 'view your shopping bag');
            }}
            aria-label="Shopping Bag"
            className={`relative inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-[#1d1b20] hover:text-[#4f378a] transition-all rounded-full hover:bg-white/50 cursor-pointer shrink-0 ${
              isCartBouncing
                ? 'scale-125 text-[#4f378a] bg-white/75 ring-4 ring-[#6750a4]/30'
                : 'active:scale-95'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[21px] leading-none transition-transform duration-300 ${
                isCartBouncing ? 'scale-115 text-[#4f378a] -rotate-12' : ''
              }`}
            >
              shopping_bag
            </span>
            <span
              className={`absolute top-0.5 right-0.5 bg-[#4f378a] text-white text-[10px] font-bold rounded-full min-w-[17px] h-[17px] px-1 flex items-center justify-center ring-1 ring-white/85 shadow-xs tabular-nums transition-all duration-300 ${
                isCartBouncing
                  ? 'scale-135 bg-[#6750a4] text-white ring-2 ring-white shadow-md'
                  : ''
              }`}
            >
              {cartCount}
            </span>
          </button>

          {/* User Profile with Hover/Click Dropdown */}
          {user ? (
            <div
              className="relative group pl-1.5 sm:pl-2 border-l border-slate-900/12"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen((prev) => !prev);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-1 px-1.5 rounded-full hover:bg-white/50 transition-all cursor-pointer"
                title="View User Profile"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#4f378a] to-[#6750a4] text-white ring-1 ring-white/80 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {user.initials}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-[#1d1b20] max-w-[100px] truncate">
                  {user.name}
                </span>
                <span className="hidden sm:inline-block material-symbols-outlined text-xs text-[#494551] transition-transform group-hover:rotate-180">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu on hover / toggle */}
              <div
                className={`absolute right-0 top-full pt-2 z-50 ${
                  isDropdownOpen ? 'block' : 'hidden group-hover:block'
                }`}
              >
                <div className="w-48 bg-surface/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/40 py-1.5 overflow-hidden">
                  <div className="px-3.5 py-2 border-b border-outline-variant/30 bg-surface-container-low/50">
                    <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                    <p className="text-[11px] text-on-surface-variant capitalize">{user.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onNavigate('profile');
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">person</span>
                    <span>Profile Details</span>
                  </button>
                  {user.role === 'Admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm text-primary">dashboard</span>
                      <span>Admin Dashboard</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-error hover:bg-error-container/20 flex items-center gap-2 cursor-pointer transition-colors border-t border-outline-variant/20"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onNavigate('signin');
              }}
              className="hidden sm:inline-flex px-3 lg:px-3.5 py-1.5 rounded-full border border-white/65 bg-white/30 hover:bg-white/55 text-[11px] lg:text-xs font-bold text-[#1d1b20] shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] transition-all cursor-pointer whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen((prev) => !prev);
              setIsDropdownOpen(false);
            }}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-[#1d1b20] hover:text-[#4f378a] hover:bg-white/50 transition-colors active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="pointer-events-auto md:hidden absolute right-3 top-full mt-1 w-[68%] min-w-[235px] max-w-[290px] max-h-[calc(100dvh-72px)] overflow-y-auto z-50 border border-outline-variant/40 bg-[#fbf6f0] shadow-2xl rounded-2xl animate-fadeIn">
          <nav className="relative flex flex-col pt-3">
            <div className="flex flex-col px-3 pb-2 space-y-1 relative z-10">
              <button
                type="button"
                onClick={() => {
                  handleProtectedNav(() => {
                    setActiveSection('home');
                    onNavigate('storefront');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 'navigate Home');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront' && activeSection === 'home'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'font-medium text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    currentScreen === 'storefront' && activeSection === 'home'
                      ? 'text-white'
                      : 'text-primary'
                  }`}
                >
                  home
                </span>
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('collections', 'browse collections')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront' && activeSection === 'collections'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'font-medium text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    currentScreen === 'storefront' && activeSection === 'collections'
                      ? 'text-white'
                      : 'text-primary'
                  }`}
                >
                  cake
                </span>
                <span>Collections</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('inspiration-gallery', 'view Gallery section')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront' && activeSection === 'inspiration-gallery'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'font-medium text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    currentScreen === 'storefront' && activeSection === 'inspiration-gallery'
                      ? 'text-white'
                      : 'text-primary'
                  }`}
                >
                  photo_library
                </span>
                <span>Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('about', 'view About section')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront' && activeSection === 'about'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'font-medium text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    currentScreen === 'storefront' && activeSection === 'about'
                      ? 'text-white'
                      : 'text-primary'
                  }`}
                >
                  auto_awesome
                </span>
                <span>About Our Craft</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('custom-cakes', 'customize cakes')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront' && activeSection === 'custom-cakes'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'font-medium text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    currentScreen === 'storefront' && activeSection === 'custom-cakes'
                      ? 'text-white'
                      : 'text-primary'
                  }`}
                >
                  palette
                </span>
                <span>Custom Cakes</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('testimonials', 'view testimonials')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront' && activeSection === 'testimonials'
                    ? 'bg-primary text-white font-bold shadow-xs'
                    : 'font-medium text-on-surface hover:bg-surface-container'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    currentScreen === 'storefront' && activeSection === 'testimonials'
                      ? 'text-white'
                      : 'text-primary'
                  }`}
                >
                  support_agent
                </span>
                <span>Testimonial</span>
              </button>

              {/* User Account / Auth Actions in Mobile Menu */}
              <div className="pt-2 mt-2 border-t border-[#e8dfd5]">
                {user ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
                        {user.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                        <p className="text-[10px] text-on-surface-variant capitalize">{user.role}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('profile');
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                        currentScreen === 'profile'
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base text-primary">person</span>
                      <span>Profile Details</span>
                    </button>
                    {user.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onNavigate('dashboard');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base text-primary">dashboard</span>
                        <span>Admin Dashboard</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onLogout?.();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-error hover:bg-error-container/20 transition-colors text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('signin');
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-colors text-center cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onNavigate('signup');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors text-center cursor-pointer"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Decorative Curved Wave Footer in Mobile View */}
            <div className="relative w-full h-28 -mt-1 select-none pointer-events-none overflow-hidden">
              <svg
                viewBox="0 0 400 140"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
              >
                <defs>
                  <linearGradient id="mobileNavWaveGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#9b3b60" />
                    <stop offset="50%" stopColor="#c74f7d" />
                    <stop offset="100%" stopColor="#ec6397" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,128 C35,58 165,58 275,34 C345,18 384,4 400,0 L400,140 L0,140 Z"
                  fill="url(#mobileNavWaveGrad)"
                />
              </svg>
              <div className="absolute inset-x-0 bottom-3 flex flex-col items-center justify-center text-center z-10 -translate-x-2">
                <p className="font-serif italic text-[#fdf8f4] text-[15px] leading-snug tracking-wide drop-shadow-xs">
                  Sweet Moments,
                </p>
                <p className="font-serif italic text-[#fdf8f4] text-[15px] leading-snug tracking-wide flex items-center gap-1.5 drop-shadow-xs">
                  <span>Always</span>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 text-[#fdf8f4] inline-block translate-y-[1px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20.5c-4.5-3.8-8.5-7.2-8.5-11.2C3.5 6.4 5.8 4 8.8 4c1.7 0 3.2.8 3.2 2.2 0-1.4 1.5-2.2 3.2-2.2 3 0 5.3 2.4 5.3 5.3 0 4-4 7.4-8.5 11.2z" />
                    <circle cx="12" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </p>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
