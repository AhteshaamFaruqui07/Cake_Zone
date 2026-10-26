/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenType, CakeProduct, CartItem } from './types';
import { INITIAL_CART } from './data/initialData';
import { supabase } from './supabaseClient';
import {
  fetchCartItems,
  addCartItemToDb,
  updateCartItemQuantityInDb,
  deleteCartItemFromDb,
  clearUserCartInDb,
  isUserAdminSync,
  resolveIsAdminFromSupabase,
} from './services/supabaseData';
import { Navbar } from './components/Navbar';
import { Storefront } from './components/Storefront';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { AdminDashboard } from './components/AdminDashboard';
import { CartDrawer } from './components/CartDrawer';
import { CakeConfiguratorModal } from './components/CakeConfiguratorModal';
import { QuickViewModal } from './components/QuickViewModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { UpdatePassword } from './components/UpdatePassword';
import { UserProfile } from './components/UserProfile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (
        path === '/update-password' ||
        path === '/reset-password' ||
        window.location.hash.includes('type=recovery')
      ) {
        return 'update-password';
      }
      if (path === '/profile') return 'profile';
      if (path === '/login' || path === '/signin') return 'signin';
      if (path === '/signup') return 'signup';
    }
    return 'storefront';
  });
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
      window.location.pathname === '/update-password' ||
      window.location.pathname === '/reset-password' ||
      window.location.hash.includes('type=recovery')
    ) {
      if (window.location.pathname !== '/update-password') {
        window.history.replaceState(null, '', `/update-password${window.location.hash}`);
      }
      setCurrentScreen('update-password');
    }

    const verifyInitialSessionAndRoute = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      let isAdmin = false;

      if (session?.user) {
        if (window.opener && window.name === 'CakeZoneGoogleAuth') {
          window.opener.postMessage(
            {
              type: 'SUPABASE_OAUTH_SUCCESS',
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
            '*'
          );
          window.close();
          return;
        }
        const userEmail = session.user.email || '';
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          userEmail.split('@')[0] ||
          'Member';
        isAdmin = await resolveIsAdminFromSupabase(session.user);
        setCurrentUser({
          name,
          role: isAdmin ? 'Admin' : 'Customer',
          initials: (name.slice(0, 2) || 'CZ').toUpperCase(),
          email: userEmail,
        });

        const { data: dbCart } = await fetchCartItems();
        if (dbCart && dbCart.length > 0) {
          setCartItems(dbCart);
        }
      }

      // Check current URL path to protect private pages
      const path = window.location.pathname;
      if (
        path === '/update-password' ||
        path === '/reset-password' ||
        window.location.hash.includes('type=recovery')
      ) {
        setCurrentScreen('update-password');
        return;
      }

      const isAdminRoute =
        path === '/dashboard' ||
        path.startsWith('/dashboard/') ||
        path === '/admin' ||
        path.startsWith('/admin/');
      const isProfileRoute = path === '/profile' || path.startsWith('/profile/');

      if (isAdminRoute || isProfileRoute) {
        if (!session) {
          window.history.replaceState(null, '', '/login');
          setCurrentScreen('signin');
          showToast('Please sign in to access your profile.');
        } else {
          if (isAdminRoute && isAdmin) {
            setCurrentScreen('dashboard');
          } else {
            if (isAdminRoute) {
              window.history.replaceState(null, '', '/profile');
              showToast('Only Admin has privilege to access the dashboard.');
            }
            setCurrentScreen('profile');
          }
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
        if (session?.user && !params.get('signup')) {
          window.history.replaceState(null, '', '/');
          setCurrentScreen('storefront');
        } else {
          setCurrentScreen('signin');
        }
      } else if (path === '/signup') {
        if (session?.user) {
          window.history.replaceState(null, '', '/');
          setCurrentScreen('storefront');
        } else {
          setCurrentScreen('signup');
        }
      }
    };

    verifyInitialSessionAndRoute();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (window.location.pathname !== '/update-password') {
          window.history.replaceState(null, '', '/update-password');
        }
        setCurrentScreen('update-password');
        return;
      }

      if (session?.user) {
        if (typeof window !== 'undefined' && sessionStorage.getItem('cakezone_signup_in_progress') === 'true') {
          return;
        }
        if (window.opener && window.name === 'CakeZoneGoogleAuth') {
          window.opener.postMessage(
            {
              type: 'SUPABASE_OAUTH_SUCCESS',
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            },
            '*'
          );
          window.close();
          return;
        }
        const userEmail = session.user.email || '';
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          userEmail.split('@')[0] ||
          'Member';
        const syncAdmin = isUserAdminSync(session.user);
        setCurrentUser({
          name,
          role: syncAdmin ? 'Admin' : 'Customer',
          initials: (name.slice(0, 2) || 'CZ').toUpperCase(),
          email: userEmail,
        });
        resolveIsAdminFromSupabase(session.user).then((verifiedAdmin) => {
          setCurrentUser((prev) =>
            prev ? { ...prev, role: verifiedAdmin ? 'Admin' : 'Customer' } : prev
          );
        });
        fetchCartItems().then(({ data: dbCart }) => {
          if (dbCart) {
            setCartItems(dbCart);
          }
        });
        if (
          event === 'SIGNED_IN' &&
          window.location.pathname !== '/update-password' &&
          !window.location.hash.includes('type=recovery')
        ) {
          setCurrentScreen((prev) => (prev === 'signin' ? 'storefront' : prev));
        }
      } else {
        setCurrentUser(null);
        setCartItems([]);
      }
    });

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_OAUTH_SUCCESS' && event.data.access_token) {
        await supabase.auth.setSession({
          access_token: event.data.access_token,
          refresh_token: event.data.refresh_token,
        });
        window.history.replaceState(null, '', '/');
        setCurrentScreen('storefront');
      }
    };

    const handlePopState = async () => {
      const path = window.location.pathname;
      const isAdminRoute =
        path === '/dashboard' ||
        path.startsWith('/dashboard/') ||
        path === '/admin' ||
        path.startsWith('/admin/');
      const isProfileRoute = path === '/profile' || path.startsWith('/profile/');

      if (isAdminRoute || isProfileRoute) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.history.replaceState(null, '', '/login');
          setCurrentScreen('signin');
          showToast('Please sign in to access your profile.');
          return;
        }
        const isAdmin = await resolveIsAdminFromSupabase(session.user);
        if (isAdminRoute && isAdmin) {
          setCurrentScreen('dashboard');
        } else {
          if (isAdminRoute) {
            window.history.replaceState(null, '', '/profile');
            showToast('Only Admin has privilege to access the dashboard.');
          }
          setCurrentScreen('profile');
        }
      } else if (path === '/update-password' || path === '/reset-password') {
        setCurrentScreen('update-password');
      } else if (path === '/login' || path === '/signin') {
        setCurrentScreen('signin');
      } else if (path === '/signup') {
        setCurrentScreen('signup');
      } else {
        setCurrentScreen('storefront');
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
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
    if (screen === 'dashboard' || screen === 'profile') {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Please sign in to access your profile.');
        window.history.pushState(null, '', '/login');
        setCurrentScreen('signin');
        return;
      }
      const isAdmin = await resolveIsAdminFromSupabase(session.user);
      if (screen === 'dashboard' && !isAdmin) {
        showToast('Only Admin has privilege to access the dashboard.');
        setCurrentScreen('profile');
        if (window.location.pathname !== '/profile') {
          window.history.pushState(null, '', '/profile');
        }
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
        : screen === 'update-password'
        ? '/update-password'
        : screen === 'profile'
        ? '/profile'
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
    setCartItems([]);
    showToast('Signed out of CakeZone.');
    navigateTo('storefront');
  };

  const handleQuickView = (cake: CakeProduct) => {
    setQuickViewCake(cake);
  };

  const handleAddToCart = async (cake: CakeProduct, quantity = 1) => {
    const tempId = `cart-${Date.now()}`;
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
          id: tempId,
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
    setIsCartOpen(true);

    const { data: savedItem } = await addCartItemToDb({
      cakeId: cake.id,
      name: cake.name,
      price: cake.price,
      quantity,
      image: cake.image,
      details: cake.servings,
    });
    if (savedItem) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === tempId || (savedItem.cakeId && item.cakeId === savedItem.cakeId)
            ? savedItem
            : item
        )
      );
    }
  };

  const handleOrderNow = (cake: CakeProduct) => {
    handleAddToCart(cake, 1);
    setIsCartOpen(true);
  };

  const handleAddCustomCake = async (customCake: {
    name: string;
    price: number;
    image: string;
    details: string;
  }) => {
    const tempId = `cart-custom-${Date.now()}`;
    setCartItems((prev) => [
      ...prev,
      {
        id: tempId,
        name: customCake.name,
        price: customCake.price,
        quantity: 1,
        image: customCake.image,
        details: customCake.details,
      },
    ]);
    showToast(`Custom cake creation added to order bag.`);
    setIsCartOpen(true);

    const { data: savedItem } = await addCartItemToDb({
      name: customCake.name,
      price: customCake.price,
      quantity: 1,
      image: customCake.image,
      details: customCake.details,
    });
    if (savedItem) {
      setCartItems((prev) => prev.map((item) => (item.id === tempId ? savedItem : item)));
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    let updatedQty = 0;
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            updatedQty = i.quantity + delta;
            return updatedQty > 0 ? { ...i, quantity: updatedQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );

    await updateCartItemQuantityInDb(id, updatedQty);
  };

  const handleRemoveItem = async (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
    showToast('Item removed from bag.');
    await deleteCartItemFromDb(id);
  };

  const handleClearCart = async () => {
    setCartItems([]);
    await clearUserCartInDb();
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 sm:top-24 left-1/2 transform -translate-x-1/2 z-[100] w-[calc(100%-2rem)] sm:w-auto max-w-md bg-primary text-on-primary px-4 sm:px-6 py-3 rounded-2xl sm:rounded-full shadow-2xl text-xs sm:text-sm font-semibold flex items-center justify-between sm:justify-center gap-2.5 animate-bounce">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-base shrink-0">check_circle</span>
            <span className="tracking-wide truncate sm:whitespace-normal">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-1 hover:opacity-80 p-1 rounded-full hover:bg-black/10 transition-colors text-xs shrink-0"
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

      {currentScreen === 'update-password' && (
        <UpdatePassword
          onNavigate={(screen) => navigateTo(screen)}
          onPasswordUpdated={() => {
            setCurrentUser(null);
            setAuthSuccessMessage('Your password has been updated successfully. Please sign in with your new password.');
            showToast('Password updated! Please sign in.');
            window.history.replaceState(null, '', '/login');
            setCurrentScreen('signin');
          }}
        />
      )}

      {currentScreen === 'profile' && (
        <UserProfile
          user={currentUser}
          cartItems={cartItems}
          onNavigate={(screen) => navigateTo(screen)}
          onUpdateUser={(updated) => {
            setCurrentUser(updated);
            showToast('Profile updated!');
          }}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenConfigurator={() => setIsConfiguratorOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === 'dashboard' && currentUser?.role === 'Admin' && (
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
        customerName={currentUser?.name}
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
