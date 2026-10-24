/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenType, CakeProduct, CartItem } from './types';
import { INITIAL_CART } from './data/initialData';
import { supabase } from './supabaseClient';
import { Navbar } from './components/Navbar';
import { Storefront } from './components/Storefront';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { AdminDashboard } from './components/AdminDashboard';
import { CartDrawer } from './components/CartDrawer';
import { CakeConfiguratorModal } from './components/CakeConfiguratorModal';
import { QuickViewModal } from './components/QuickViewModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('storefront');
  const [cartItems, setCartItems] = useState<CartItem[]>(INITIAL_CART);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewCake, setQuickViewCake] = useState<CakeProduct | null>(null);
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    role: string;
    initials: string;
    email: string;
  } | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if URL indicates a password reset recovery flow
    if (
      window.location.hash.includes('type=recovery') ||
      window.location.pathname === '/reset-password'
    ) {
      setIsResetPasswordOpen(true);
    }

    const verifyInitialSessionAndRoute = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userEmail = session.user.email || '';
        const name = session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'Member';
        const isAdmin = userEmail.toLowerCase().includes('admin') || userEmail.toLowerCase().includes('baker');
        setCurrentUser({
          name,
          role: isAdmin ? 'Admin' : 'VIP Member',
          initials: (name.slice(0, 2) || 'CZ').toUpperCase(),
          email: userEmail,
        });
      }

      // Check current URL path to protect private pages
      const path = window.location.pathname;
      const isPrivate =
        path === '/dashboard' ||
        path.startsWith('/dashboard/') ||
        path === '/admin' ||
        path.startsWith('/admin/');

      if (isPrivate) {
        // Protect private pages with supabase.auth.getSession() — if no session, redirect to /login
        if (!session) {
          window.history.replaceState(null, '', '/login');
          setCurrentScreen('signin');
          showToast('Please sign in to access private pages.');
        } else {
          setCurrentScreen('dashboard');
        }
      } else if (path === '/login' || path === '/signin') {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        if (emailParam) {
          setRegisteredEmail(emailParam);
        }
        if (params.get('signup') === 'success') {
          setAuthSuccessMessage('Your account has been created. Please check your email and verify your address before logging in.');
        }
        setCurrentScreen('signin');
      } else if (path === '/signup') {
        setCurrentScreen('signup');
      }
    };

    verifyInitialSessionAndRoute();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordOpen(true);
      }

      if (session?.user) {
        const userEmail = session.user.email || '';
        const name = session.user.user_metadata?.full_name || userEmail.split('@')[0] || 'Member';
        const isAdmin = userEmail.toLowerCase().includes('admin') || userEmail.toLowerCase().includes('baker');
        setCurrentUser({
          name,
          role: isAdmin ? 'Admin' : 'VIP Member',
          initials: (name.slice(0, 2) || 'CZ').toUpperCase(),
          email: userEmail,
        });
      } else {
        setCurrentUser(null);
      }
    });

    const handlePopState = async () => {
      const path = window.location.pathname;
      const isPrivate =
        path === '/dashboard' ||
        path.startsWith('/dashboard/') ||
        path === '/admin' ||
        path.startsWith('/admin/');

      if (isPrivate) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.history.replaceState(null, '', '/login');
          setCurrentScreen('signin');
          showToast('Please sign in to access private pages.');
          return;
        }
        setCurrentScreen('dashboard');
      } else if (path === '/login' || path === '/signin') {
        setCurrentScreen('signin');
      } else if (path === '/signup') {
        setCurrentScreen('signup');
      } else {
        setCurrentScreen('storefront');
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  const handleRequireAuth = (actionName?: string) => {
    showToast(actionName ? `Please sign in to ${actionName}.` : 'Please sign in to continue.');
    navigateTo('signin');
  };

  const navigateTo = async (screen: ScreenType) => {
    // Protect private pages with supabase.auth.getSession() — if no session, redirect to /login
    if (screen === 'dashboard') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Please sign in to access private pages.');
        window.history.pushState(null, '', '/login');
        setCurrentScreen('signin');
        return;
      }
    }

    setCurrentScreen(screen);
    const path =
      screen === 'storefront'
        ? '/'
        : screen === 'signin'
        ? '/login'
        : screen === 'signup'
        ? '/signup'
        : '/dashboard';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signout
    }
    setCurrentUser(null);
    showToast('Signed out of CakeZone.');
    navigateTo('storefront');
  };

  const handleQuickView = (cake: CakeProduct) => {
    setQuickViewCake(cake);
  };

  const handleAddToCart = (cake: CakeProduct, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.cakeId === cake.id);
      if (existing) {
        return prev.map((i) =>
          i.cakeId === cake.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}`,
          cakeId: cake.id,
          name: cake.name,
          price: cake.price,
          quantity,
          image: cake.image,
          details: cake.servings,
        },
      ];
    });
    showToast(`Added ${quantity}x "${cake.name}" to your artisanal bag.`);
  };

  const handleOrderNow = (cake: CakeProduct) => {
    handleAddToCart(cake, 1);
    setIsCartOpen(true);
  };

  const handleAddCustomCake = (customCake: {
    name: string;
    price: number;
    image: string;
    details: string;
  }) => {
    setCartItems((prev) => [
      ...prev,
      {
        id: `cart-custom-${Date.now()}`,
        name: customCake.name,
        price: customCake.price,
        quantity: 1,
        image: customCake.image,
        details: customCake.details,
      },
    ]);
    showToast(`Custom cake creation added to order bag.`);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Item removed from bag.');
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 sm:top-24 left-1/2 transform -translate-x-1/2 z-[100] bg-primary text-on-primary px-6 py-3 rounded-full shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-bounce">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span className="tracking-wide">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 p-0.5 rounded-full hover:bg-black/10 transition-colors text-xs"
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* For Storefront, SignIn, and SignUp, show the main unified Navbar */}
      {currentScreen !== 'dashboard' && (
        <Navbar
          currentScreen={currentScreen}
          onNavigate={(screen) => navigateTo(screen)}
          cartCount={totalCartCount}
          onOpenCart={() => {
            if (!currentUser) {
              handleRequireAuth('view your shopping bag');
              return;
            }
            setIsCartOpen(true);
          }}
          user={currentUser}
          onLogout={handleLogout}
          onRequireAuth={handleRequireAuth}
        />
      )}

      {currentScreen === 'storefront' && (
        <Storefront
          onQuickView={(cake) => {
            if (!currentUser) {
              handleRequireAuth(`view ${cake.name}`);
              return;
            }
            handleQuickView(cake);
          }}
          onOrderNow={(cake) => {
            if (!currentUser) {
              handleRequireAuth(`order ${cake.name}`);
              return;
            }
            handleOrderNow(cake);
          }}
          onOpenConfigurator={() => {
            if (!currentUser) {
              handleRequireAuth('design custom cakes');
              return;
            }
            setIsConfiguratorOpen(true);
          }}
          userName={currentUser?.name}
          onUpdateUserName={(name) => {
            if (currentUser) {
              setCurrentUser({ ...currentUser, name });
              showToast(`Welcome, ${name}!`);
            } else {
              handleRequireAuth('save your profile');
            }
          }}
          isLoggedIn={!!currentUser}
          onRequireAuth={handleRequireAuth}
        />
      )}

      {currentScreen === 'signin' && (
        <SignIn
          onNavigate={(screen) => navigateTo(screen)}
          initialEmail={registeredEmail}
          successMessage={authSuccessMessage}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setAuthSuccessMessage(null);
            showToast(`Welcome back, ${user.name}!`);
            if (user.role === 'Admin') {
              navigateTo('dashboard');
            } else {
              navigateTo('storefront');
            }
          }}
        />
      )}

      {currentScreen === 'signup' && (
        <SignUp
          onNavigate={(screen) => navigateTo(screen)}
          onSignUpSuccess={(email) => {
            setRegisteredEmail(email);
            setAuthSuccessMessage(
              'Your account has been created. Please check your email and verify your address before logging in.'
            );
            window.history.pushState(null, '', `/login?email=${encodeURIComponent(email)}&signup=success`);
            setCurrentScreen('signin');
          }}
        />
      )}

      {currentScreen === 'dashboard' && (
        <AdminDashboard
          onNavigate={(screen) => navigateTo(screen)}
          onOpenNewCustomOrder={() => {
            if (!currentUser) {
              handleRequireAuth('create custom orders');
              return;
            }
            setIsConfiguratorOpen(true);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      {/* Bespoke Cake Configurator Modal */}
      <CakeConfiguratorModal
        isOpen={isConfiguratorOpen}
        onClose={() => setIsConfiguratorOpen(false)}
        onAddCustomCake={handleAddCustomCake}
      />

      {/* Quick View Modal */}
      <QuickViewModal
        cake={quickViewCake}
        onClose={() => setQuickViewCake(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Reset Password Modal (Triggered by recovery email link) */}
      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        onSuccess={() => {
          showToast('Password updated! You are now logged in.');
          setIsResetPasswordOpen(false);
          navigateTo('storefront');
        }}
      />
    </div>
  );
}
