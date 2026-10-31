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
  const headerRef = useRef<HTMLElement>(null);

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

  return (
    <header
      ref={headerRef}
      className="bg-surface/95 dark:bg-surface/95 backdrop-blur-md sticky top-0 z-50 w-full border-b border-outline-variant/40 shadow-xs"
    >
      {/* Main Top Nav Bar */}
      <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-3.5 max-w-7xl mx-auto">
        {/* Brand / Logo Zone */}
        <button
          type="button"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setActiveSection('home');
            onNavigate('storefront');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none group cursor-pointer shrink-0"
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
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-xs group-hover:scale-105 transition-transform cursor-pointer"
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
            className="text-lg sm:text-xl font-black text-primary tracking-tight font-headline cursor-pointer whitespace-nowrap"
          >
            CakeZone
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            type="button"
            onClick={() => {
              handleProtectedNav(() => {
                setActiveSection('home');
                onNavigate('storefront');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 'navigate Home');
            }}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
              currentScreen === 'storefront' && activeSection === 'home'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('collections', 'browse collections')}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
              currentScreen === 'storefront' && activeSection === 'collections'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Collections
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('inspiration-gallery', 'view Gallery section')}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
              currentScreen === 'storefront' && activeSection === 'inspiration-gallery'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Gallery
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('about', 'view About section')}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
              currentScreen === 'storefront' && activeSection === 'about'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            About
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('custom-cakes', 'customize cakes')}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
              currentScreen === 'storefront' && activeSection === 'custom-cakes'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Custom Cakes
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('testimonials', 'view testimonials')}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
              currentScreen === 'storefront' && activeSection === 'testimonials'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Testimonial
          </button>
          {!user && (
            <button
              type="button"
              onClick={() => onNavigate('signin')}
              className={`text-sm font-label transition-colors pb-1 cursor-pointer whitespace-nowrap focus:outline-none ${
                currentScreen === 'signin'
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary font-medium'
              }`}
            >
              Login
            </button>
          )}
        </nav>

        {/* Right Actions (Cart, Profile, Mobile Menu Button) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Shopping Bag Button */}
          <button
            type="button"
            onClick={() => {
              handleProtectedNav(onOpenCart, 'view your shopping bag');
            }}
            aria-label="Shopping Bag"
            className="relative inline-flex items-center justify-center w-10 h-10 text-on-surface hover:text-primary transition-colors active:scale-95 rounded-full hover:bg-surface-container cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">shopping_bag</span>
            <span className="absolute top-0.5 right-0.5 bg-primary text-on-primary text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-xs tabular-nums">
              {cartCount}
            </span>
          </button>

          {/* User Profile with Hover/Click Dropdown */}
          {user ? (
            <div
              className="relative group pl-1.5 sm:pl-2 border-l border-outline-variant/40"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen((prev) => !prev);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 py-1 px-1.5 rounded-xl hover:bg-surface-container transition-all cursor-pointer"
                title="View User Profile"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {user.initials}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-on-surface max-w-[110px] truncate">
                  {user.name}
                </span>
                <span className="hidden sm:inline-block material-symbols-outlined text-xs text-on-surface-variant transition-transform group-hover:rotate-180">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu on hover / toggle */}
              <div
                className={`absolute right-0 top-full pt-1.5 z-50 ${
                  isDropdownOpen ? 'block' : 'hidden group-hover:block'
                }`}
              >
                <div className="w-48 bg-surface rounded-xl shadow-xl border border-outline-variant/40 py-1.5 overflow-hidden">
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
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer whitespace-nowrap"
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
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl text-on-surface hover:text-primary hover:bg-surface-container transition-colors active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px] leading-none">
              {isMobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute right-0 top-full w-[62%] min-w-[225px] max-w-[280px] z-50 border-t border-l border-outline-variant/40 bg-[#fbf6f0] shadow-2xl rounded-bl-2xl overflow-hidden animate-fadeIn">
          <nav className="relative flex flex-col pt-3">
            <div className="flex flex-col px-3 pb-2 space-y-1 relative z-10">
              <button
                type="button"
                onClick={() => {
                  handleProtectedNav(() => {
                    onNavigate('storefront');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }, 'navigate Home');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                  currentScreen === 'storefront'
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-base text-primary">home</span>
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('collections', 'browse collections')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-primary">cake</span>
                <span>Collections</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('inspiration-gallery', 'view Gallery section')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-primary">photo_library</span>
                <span>Gallery</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('about', 'view About section')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-primary">auto_awesome</span>
                <span>About Our Craft</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('custom-cakes', 'customize cakes')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-primary">palette</span>
                <span>Custom Cakes</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('testimonials', 'view testimonials')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-primary">support_agent</span>
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
                    <stop offset="0%" stopColor="#9e6258" />
                    <stop offset="50%" stopColor="#b87c6c" />
                    <stop offset="100%" stopColor="#d69c85" />
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
