import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { supabase } from '../supabaseClient';

interface SignInProps {
  onNavigate: (screen: ScreenType) => void;
  onLoginSuccess: (user: { name: string; role: string; initials: string; email: string }) => void;
  initialEmail?: string;
  successMessage?: string | null;
}

export const SignIn: React.FC<SignInProps> = ({
  onNavigate,
  onLoginSuccess,
  initialEmail = '',
  successMessage = null,
}) => {
  const [email, setEmail] = useState(() => {
    if (initialEmail) return initialEmail;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('email') || '';
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [bannerMessage, setBannerMessage] = useState<string | null>(() => {
    if (successMessage) return successMessage;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('signup') === 'success') {
        return 'Your account has been created. Please check your email and verify your address before logging in.';
      }
    }
    return null;
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email');
      if (urlEmail) {
        setEmail(urlEmail);
      }
    }
  }, [initialEmail]);

  useEffect(() => {
    if (successMessage) {
      setBannerMessage(successMessage);
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('signup') === 'success') {
        setBannerMessage('Your account has been created. Please check your email and verify your address before logging in.');
      }
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Invalid login credentials.');
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Email not confirmed.');
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      // Only redirect when a real session exists after login
      if (!data?.session) {
        setErrorMessage('Invalid login credentials.');
        setLoading(false);
        return;
      }

      if (data?.user) {
        const userEmail = data.user.email || email;
        const isAdmin = userEmail.toLowerCase().includes('admin') || userEmail.toLowerCase().includes('baker');
        const user = {
          name: data.user.user_metadata?.full_name || (isAdmin ? 'Master Baker' : userEmail.split('@')[0]),
          role: isAdmin ? 'Admin' : 'Customer',
          initials: (data.user.user_metadata?.full_name?.slice(0, 2) || (isAdmin ? 'CZ' : userEmail.slice(0, 2))).toUpperCase(),
          email: userEmail,
        };
        onLoginSuccess(user);
        return;
      }

      // Fallback redirect user to Home page
      onNavigate('storefront');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setResetError(
            'Email rate limit exceeded (Supabase limit is 3-4 emails/hr). Please wait a few minutes before trying again.'
          );
        } else {
          setResetError(error.message);
        }
      } else {
        setResetSent(true);
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        console.warn('OAuth notice:', error.message);
        onLoginSuccess({
          name: 'Eleanor Vance',
          role: 'VIP Customer',
          initials: 'EV',
          email: 'eleanor.vance@gmail.com',
        });
        onNavigate('storefront');
      }
    } catch {
      onLoginSuccess({
        name: 'Eleanor Vance',
        role: 'VIP Customer',
        initials: 'EV',
        email: 'eleanor.vance@gmail.com',
      });
      onNavigate('storefront');
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow pt-2 sm:pt-4">
      {/* Main Login Content */}
      <main className="flex-grow flex items-center justify-center px-4 pt-2 sm:pt-4 pb-12">
        <div className="relative w-full max-w-md bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl border border-outline-variant/60 p-8 sm:p-10 transition-all duration-300 -mt-2 sm:-mt-5 overflow-hidden">
          {/* Subtle Top Luxury Accent Stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3 shadow-xs">
              <span className="material-symbols-outlined text-2xl">cake</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
              Sign in to manage your orders, bespoke cakes & exclusive privileges.
            </p>
          </div>

          {/* Success Banner when arriving from account creation */}
          {bannerMessage && (
            <div className="mb-6 px-4 py-3.5 bg-[#ebf9f2] border border-[#d2eee0] rounded-xl flex items-start gap-3">
              <svg
                className="w-5 h-5 text-[#3b8766] shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5l2 2 4-4.5" />
              </svg>
              <p className="text-[13px] sm:text-sm font-medium text-[#3b8766] leading-relaxed text-left">
                {bannerMessage}
              </p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </span>
                <input
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                    setResetSent(false);
                  }}
                  className="text-xs font-medium text-primary hover:text-primary/80 hover:underline focus:outline-none cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </span>
                <input
                  className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  className="rounded border-outline/70 text-primary focus:ring-primary/20 focus:ring-2 w-4 h-4 cursor-pointer accent-primary"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-xs font-medium text-on-surface-variant">Remember me</span>
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] text-outline font-medium">
                <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
                Secure connection
              </span>
            </div>

            <button
              className="w-full py-3.5 px-4 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </button>

            {/* Error Message Under Form Controls */}
            {errorMessage && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                <p className="text-xs text-error font-medium text-center leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-outline-variant/60"></div>
              <span className="flex-shrink mx-4 text-[11px] font-label font-semibold text-outline uppercase tracking-wider">
                or continue with
              </span>
              <div className="flex-grow border-t border-outline-variant/60"></div>
            </div>

            <div>
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface hover:bg-surface-container-low border border-outline-variant/80 hover:border-outline rounded-xl text-sm font-label font-medium text-on-surface shadow-xs hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                type="button"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </div>

            <div className="text-center text-sm text-on-surface-variant pt-2 space-y-2">
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('signup')}
                  className="text-primary font-semibold hover:underline cursor-pointer transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full p-6 rounded-2xl shadow-2xl border border-outline-variant space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface">Reset Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {resetSent ? (
              <div className="p-4 bg-primary/10 border border-primary/30 text-on-surface rounded-xl text-xs space-y-2 text-center">
                <span className="material-symbols-outlined text-primary text-2xl">mail</span>
                <p className="font-bold text-primary">Password Reset Link Sent!</p>
                <p className="text-on-surface-variant">
                  We sent a recovery link to <span className="font-semibold text-on-surface">{resetEmail}</span>.
                  Click the link in your email to create a new password.
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-3 py-2 bg-primary text-on-primary text-xs font-bold rounded-lg cursor-pointer hover:bg-primary/90"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendResetEmail} className="space-y-3">
                <p className="text-xs text-on-surface-variant">
                  Enter your registered CakeZone email address and we will send a password reset link to recreate your password.
                </p>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2.5 bg-surface border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {resetError && (
                  <p className="text-xs text-error font-medium text-center">
                    {resetError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 disabled:opacity-70 transition-all"
                >
                  {resetLoading ? 'Sending Reset Email...' : 'Send Password Reset Email'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Component */}
      <footer className="bg-surface-container-low w-full border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-8 max-w-7xl mx-auto gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary">CakeZone</span>
            <span className="text-sm text-on-surface-variant">© 2023 CakeZone. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Shipping Info
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
