import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { supabase, signInWithGoogle } from '../supabaseClient';
import {
  resolveIsAdminFromSupabase,
  checkAccountExistsByEmail,
  registerKnownAccountEmail,
} from '../services/supabaseData';

interface SignInProps {
  onNavigate: (screen: ScreenType) => void;
  onLoginSuccess: (user: { name: string; role: string; initials: string; email: string }) => void;
  initialEmail?: string;
  successMessage?: string | null;
}

const SIGNUP_SUCCESS_MESSAGE =
  'Your account has been created. Please check your email and verify your address before logging in.';

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
      const queryEmail = params.get('email');
      if (queryEmail) return queryEmail;
      if (window.history.state?.email) return window.history.state.email;
      const storedEmail = sessionStorage.getItem('cakezone_signup_email');
      if (storedEmail) return storedEmail;
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [bannerMessage, setBannerMessage] = useState<string | null>(() => {
    if (successMessage) return successMessage;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get('signup') === 'success' ||
        window.history.state?.signupSuccess ||
        sessionStorage.getItem('cakezone_signup_success') === 'true'
      ) {
        return SIGNUP_SUCCESS_MESSAGE;
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
      registerKnownAccountEmail(initialEmail);
    }
    if (successMessage) {
      setBannerMessage(successMessage);
    }

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlEmail = params.get('email') || window.history.state?.email || sessionStorage.getItem('cakezone_signup_email');
      if (urlEmail && !initialEmail) {
        setEmail(urlEmail);
        registerKnownAccountEmail(urlEmail);
      }

      const isSignupSuccess =
        params.get('signup') === 'success' ||
        Boolean(window.history.state?.signupSuccess) ||
        sessionStorage.getItem('cakezone_signup_success') === 'true';

      if (isSignupSuccess && !successMessage) {
        setBannerMessage(SIGNUP_SUCCESS_MESSAGE);
      }

      sessionStorage.removeItem('cakezone_signup_email');
      sessionStorage.removeItem('cakezone_signup_success');
    }
  }, [initialEmail, successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          const accountExists = await checkAccountExistsByEmail(trimmedEmail);
          if (accountExists) {
            setErrorMessage('Check your email/password');
          } else {
            setErrorMessage('Account is not being created');
          }
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          await registerKnownAccountEmail(trimmedEmail);
          setErrorMessage('Email not confirmed.');
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      // Only redirect when a real session exists after login
      if (!data?.session) {
        const accountExists = await checkAccountExistsByEmail(trimmedEmail);
        setErrorMessage(accountExists ? 'Check your email/password' : 'Account is not being created');
        setLoading(false);
        return;
      }

      if (data?.user) {
        const userEmail = data.user.email || trimmedEmail;
        const userName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          userEmail.split('@')[0];
        await registerKnownAccountEmail(userEmail, userName, data.user.id);
        const isAdmin = await resolveIsAdminFromSupabase(data.user);
        const user = {
          name: userName,
          role: isAdmin ? 'Admin' : 'Customer',
          initials: (
            data.user.user_metadata?.full_name?.slice(0, 2) ||
            userEmail.slice(0, 2) ||
            'CZ'
          ).toUpperCase(),
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
    const email = resetEmail.trim();
    if (!email) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://cakezone-e7kn0thcg-ahteshaam-faruquis-projects.vercel.app/update-password',
      });
      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('60 seconds')) {
          setResetError(
            'Please wait at least 60 seconds before requesting another password recovery email.'
          );
        } else {
          setResetError(error.message);
        }
      } else {
        setResetSent(true);
        setBannerMessage(
          `A secure password recovery email has been sent to ${email} via Brevo. Please check your inbox (and Spam/Promotions folder) and click the reset link.`
        );
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during Google sign in.');
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow pt-0">
      {/* Main Login Content */}
      <main className="flex-grow flex items-start justify-center px-4 pt-1 pb-3">
        <div className="relative w-full max-w-md -mt-0.5 bg-[#fbf6f1] rounded-2xl shadow-xl hover:shadow-2xl border border-outline-variant/60 px-6 sm:px-9 pt-3 sm:pt-3.5 pb-10 sm:pb-11 transition-all duration-300 overflow-hidden">
          {/* Subtle Top Luxury Accent Stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 z-10" />

          <div className="relative z-10 text-center mb-2.5">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-1 shadow-xs overflow-hidden">
              <img
                src="https://imagepaste.org/i/rnazzt2e.gif"
                alt="CakeZone"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-headline font-bold text-on-surface tracking-tight mb-0.5">
              Welcome Back
            </h1>
            <p className="text-xs text-on-surface-variant leading-snug max-w-xs mx-auto">
              Sign in to manage your orders, bespoke cakes & exclusive privileges.
            </p>
          </div>

          {/* Success Banner when arriving from account creation */}
          {bannerMessage && (
            <div className="relative z-10 mb-3 px-3.5 py-2.5 bg-[#ebf9f2] border border-[#d2eee0] rounded-xl flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-[#3b8766] shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.5l2 2 4-4.5" />
              </svg>
              <p className="text-xs font-medium text-[#3b8766] leading-snug text-left">
                {bannerMessage}
              </p>
            </div>
          )}

          <form className="relative z-10 space-y-2.5 sm:space-y-3" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </span>
                <input
                  className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  placeholder="name@gmail.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-lg">lock</span>
                </span>
                <input
                  className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  className="rounded border-outline/70 text-primary focus:ring-primary/20 focus:ring-2 w-4 h-4 cursor-pointer accent-primary"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-xs font-medium text-on-surface-variant">Remember me</span>
              </label>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  setResetEmail(email);
                  setResetError('');
                  setShowForgotModal(true);
                  setResetSent(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setResetEmail(email);
                    setResetError('');
                    setShowForgotModal(true);
                    setResetSent(false);
                  }
                }}
                className="text-xs font-medium text-primary hover:text-primary/80 hover:underline focus:outline-none cursor-pointer transition-colors"
              >
                Forgot password?
              </span>
            </div>

            <button
              className="w-full py-2.5 px-4 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </button>

            {/* Error Message Under Form Controls */}
            {errorMessage && (
              <div className="p-2.5 bg-white/95 border border-error/20 rounded-xl">
                <p className="text-xs text-error font-medium text-center leading-relaxed">
                  {errorMessage}
                  {errorMessage === 'Account is not being created' && (
                    <>
                      {' '}
                      <a
                        href="/signup"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('signup');
                        }}
                        className="text-primary font-semibold underline hover:text-primary/80 cursor-pointer transition-colors"
                      >
                        Sign Up
                      </a>
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="relative flex py-0.5 items-center">
              <div className="flex-grow border-t border-outline-variant/60"></div>
              <span className="flex-shrink mx-4 text-[10px] font-label font-semibold text-outline uppercase tracking-wider">
                or continue with
              </span>
              <div className="flex-grow border-t border-outline-variant/60"></div>
            </div>

            <div>
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-surface hover:bg-surface-container-low border border-outline-variant/80 hover:border-outline rounded-xl text-sm font-label font-medium text-on-surface shadow-xs hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
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

            <div className="text-center text-xs sm:text-sm text-on-surface pt-0.5">
              <p className="font-medium">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('signup')}
                  className="text-primary font-bold hover:underline cursor-pointer transition-colors"
                >
                  Sign up
                </button>
              </p>
            </div>
          </form>

          <img
            src="/assets/aistudio/image_44949a6b.png"
            alt=""
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[106%] max-w-none pointer-events-none select-none z-0"
          />
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-surface-container-lowest max-w-xs w-full p-5 rounded-2xl shadow-2xl border border-outline-variant space-y-4 text-center">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-on-surface">
                Forgot Password
              </h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="py-2 space-y-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto">
                <span className="material-symbols-outlined text-xl">info</span>
              </div>
              <p className="text-sm font-medium text-on-surface leading-relaxed">
                It is out of service, create a new account
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="flex-1 py-2 bg-surface border border-outline-variant text-on-surface text-xs font-semibold rounded-xl cursor-pointer hover:bg-surface-container-low transition-all"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  onNavigate('signup');
                }}
                className="flex-1 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl cursor-pointer hover:bg-primary/90 transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-surface-container-low w-full border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-8 max-w-7xl mx-auto gap-6">
          <div className="text-sm text-on-surface-variant font-label">
            © 2027 CakeZone. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
