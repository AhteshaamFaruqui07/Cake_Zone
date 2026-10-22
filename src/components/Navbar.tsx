import React, { useState } from 'react';
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

  const handleProtectedNav = (action: () => void, actionName: string) => {
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

  return (
    <header className="bg-surface/95 dark:bg-surface/95 backdrop-blur-md sticky top-0 z-50 w-full border-b border-outline-variant/40 shadow-xs">

      {/* Main Top Nav Bar */}
      <div className="flex justify-between items-center px-6 py-3.5 max-w-7xl mx-auto">
        {/* Brand / Logo Zone */}
        <button
          onClick={() => {
            if (!user) {
              handleProtectedNav(() => onNavigate('storefront'), 'access the website');
            } else {
              onNavigate('storefront');
            }
          }}
          className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
        >
          <img
            src={LOGO_URL}
            alt="CakeZone Logo"
            className="w-10 h-10 rounded-full object-cover shadow-xs group-hover:scale-105 transition-transform"
            onError={(e) => {
              // Graceful SVG fallback in case of network issue
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-xl font-black text-primary tracking-tight font-headline">
            CakeZone
          </span>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          <button
            onClick={() => {
              handleProtectedNav(() => {
                onNavigate('storefront');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 'navigate Home');
            }}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer ${
              currentScreen === 'storefront'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              handleProtectedNav(() => {
                onNavigate('storefront');
                setTimeout(() => {
                  document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }, 'browse collections');
            }}
            className="text-sm font-label text-on-surface-variant hover:text-primary font-medium transition-colors cursor-pointer"
          >
            Collections
          </button>
          <button
            onClick={() => {
              handleProtectedNav(() => {
                onNavigate('storefront');
                setTimeout(() => {
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }, 'view About section');
            }}
            className="text-sm font-label text-on-surface-variant hover:text-primary font-medium transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => {
              handleProtectedNav(() => {
                onNavigate('storefront');
                setTimeout(() => {
                  document.getElementById('custom-cakes')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }, 'customize cakes');
            }}
            className="text-sm font-label text-on-surface-variant hover:text-primary font-medium transition-colors cursor-pointer"
          >
            Custom Cakes
          </button>
          <button
            onClick={() => {
              handleProtectedNav(() => {
                onNavigate('storefront');
                setTimeout(() => {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }, 'contact us');
            }}
            className="text-sm font-label text-on-surface-variant hover:text-primary font-medium transition-colors cursor-pointer"
          >
            Contact
          </button>
          <button
            onClick={() => {
              handleProtectedNav(() => onNavigate('dashboard'), 'access Master Baker dashboard');
            }}
            className={`text-sm font-label transition-colors pb-1 cursor-pointer ${
              currentScreen === 'dashboard'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary font-medium'
            }`}
          >
            Dashboard
          </button>
          {!user && (
            <button
              onClick={() => onNavigate('signin')}
              className={`text-sm font-label transition-colors pb-1 cursor-pointer ${
                currentScreen === 'signin'
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary font-medium'
              }`}
            >
              Login
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Shopping Bag Button */}
          <button
            onClick={() => {
              handleProtectedNav(onOpenCart, 'view your shopping bag');
            }}
            aria-label="Shopping Bag"
            className="relative p-2 text-on-surface hover:text-primary transition-colors active:scale-95 rounded-full hover:bg-surface-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-primary text-on-primary text-[11px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-xs">
                {cartCount}
              </span>
            )}
          </button>

          {/* User Profile with Hover Dropdown */}
          {user ? (
            <div
              className="relative group pl-2 border-l border-outline-variant/40"
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 py-1 px-1.5 rounded-xl hover:bg-surface-container transition-all cursor-pointer"
                title="Account Menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.initials}
                </div>
                <span className="text-xs font-bold text-on-surface">
                  {user.name}
                </span>
                <span className="material-symbols-outlined text-xs text-on-surface-variant transition-transform group-hover:rotate-180">
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
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onNavigate('dashboard');
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-on-surface hover:bg-surface-container flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-primary">dashboard</span>
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout?.();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-error hover:bg-error-container/20 flex items-center gap-2 cursor-pointer transition-colors border-t border-outline-variant/20"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('signin')}
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
