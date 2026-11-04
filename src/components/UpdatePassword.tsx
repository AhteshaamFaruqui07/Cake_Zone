import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { supabase } from '../supabaseClient';

interface UpdatePasswordProps {
  onNavigate: (screen: ScreenType) => void;
  onPasswordUpdated: () => void;
}

export const UpdatePassword: React.FC<UpdatePasswordProps> = ({
  onNavigate,
  onPasswordUpdated,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  // Helper to hydrate session from URL hash, query params, or sessionStorage
  const ensureRecoverySession = async (): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      const rawHash = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(rawHash);
      const searchParams = new URLSearchParams(window.location.search);

      // Check if Supabase returned an expired/invalid link error in URL
      const errorDesc =
        hashParams.get('error_description') || searchParams.get('error_description');
      if (errorDesc) {
        setErrorMessage(
          decodeURIComponent(errorDesc.replace(/\+/g, ' ')) +
            '. Please request a fresh reset link below.'
        );
      }

      // 1. Check URL hash for access_token & refresh_token (Implicit flow)
      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      if (hashAccessToken && hashRefreshToken) {
        sessionStorage.setItem(
          'cakezone_recovery_tokens',
          JSON.stringify({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          })
        );
        const { data, error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken,
        });
        if (!error && data?.session) {
          setHasValidSession(true);
          setErrorMessage('');
          return true;
        }
      }

      // 2. Check URL query for token_hash (Email template token_hash flow)
      const tokenHash = searchParams.get('token_hash');
      const type = (searchParams.get('type') as any) || 'recovery';
      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === 'recovery' ? 'recovery' : 'email',
        });
        if (!error && data?.session) {
          sessionStorage.setItem(
            'cakezone_recovery_tokens',
            JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            })
          );
          setHasValidSession(true);
          setErrorMessage('');
          return true;
        }
      }

      // 3. Check URL query for PKCE ?code=
      const code = searchParams.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.session) {
          sessionStorage.setItem(
            'cakezone_recovery_tokens',
            JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            })
          );
          setHasValidSession(true);
          setErrorMessage('');
          return true;
        }
      }

      // 4. Check existing active Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
        return true;
      }

      // 5. Fallback to stored recovery tokens captured by App.tsx on initial page load
      const cachedTokensRaw = sessionStorage.getItem('cakezone_recovery_tokens');
      if (cachedTokensRaw) {
        try {
          const cached = JSON.parse(cachedTokensRaw);
          if (cached?.access_token && cached?.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token: cached.access_token,
              refresh_token: cached.refresh_token,
            });
            if (!error && data?.session) {
              setHasValidSession(true);
              setErrorMessage('');
              return true;
            }
          }
        } catch {
          // Ignore malformed storage
        }
      }
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setInitializing(true);
      await ensureRecoverySession();
      if (mounted) {
        setInitializing(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        sessionStorage.setItem(
          'cakezone_recovery_tokens',
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
        );
        if (mounted) {
          setHasValidSession(true);
          setErrorMessage('');
          setInitializing(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter both fields.');
      return;
    }

    setLoading(true);
    try {
      // Ensure the recovery session is active right before calling updateUser
      const sessionReady = await ensureRecoverySession();
      if (!sessionReady) {
        setErrorMessage(
          'Your password reset link has expired or was already used. Please send a fresh reset link below.'
        );
        setHasValidSession(false);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      sessionStorage.removeItem('cakezone_recovery_tokens');
      await supabase.auth.signOut();
      onPasswordUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while updating your password.');
      setLoading(false);
    }
  };

  const handleResendRecoveryLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResendSuccess('');
    const target = resendEmail.trim();
    if (!target) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    setResendLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: redirectUrl,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setResendSuccess(
          `A fresh password reset link has been sent to ${target}. Please open the newest email in your inbox and click the link.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send reset link.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow pt-2 sm:pt-4">
      <main className="flex-grow flex items-center justify-center px-4 pt-2 sm:pt-4 pb-12">
        <div className="relative w-full max-w-md bg-[#fbf6f1] rounded-2xl shadow-xl hover:shadow-2xl border border-outline-variant/60 p-7 sm:p-9 transition-all duration-300 -mt-2 sm:-mt-5 overflow-hidden">
          {/* Subtle Top Luxury Accent Stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3 shadow-xs">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight mb-1.5">
              Update Password
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
              {hasValidSession
                ? 'Enter and confirm your new password below to secure your CakeZone account.'
                : 'Verify your password reset link or request a fresh recovery link below.'}
            </p>
          </div>

          {initializing ? (
            <div className="text-center space-y-3 py-6">
              <div className="w-8 h-8 rounded-full border-3 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Verifying your password recovery session...
              </p>
            </div>
          ) : hasValidSession ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </span>
                  <input
                    className="w-full pl-11 pr-11 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-outline hover:text-on-surface cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">verified_user</span>
                  </span>
                  <input
                    className="w-full pl-11 pr-11 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                    placeholder="Re-enter new password"
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-xs text-error font-medium text-center leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              )}

              <button
                className="w-full py-3 px-4 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>

              <div className="text-center text-xs sm:text-sm text-on-surface-variant pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="text-primary font-semibold hover:underline cursor-pointer transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResendRecoveryLink}>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                {errorMessage ||
                  'No active recovery session was found for this link (it may have expired or opened on an older deployment). Enter your email below to send a fresh reset link.'}
              </div>

              {resendSuccess && (
                <div className="p-3.5 bg-[#ebf9f2] border border-[#d2eee0] rounded-xl text-xs text-[#2a674d] font-medium leading-relaxed">
                  {resendSuccess}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">mail</span>
                  </span>
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-11 pr-4 py-2.5 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resendLoading}
                className="w-full py-3 px-4 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-primary/95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                <span>{resendLoading ? 'Sending Fresh Link...' : 'Send Fresh Reset Link'}</span>
                <span className="material-symbols-outlined text-base">send</span>
              </button>

              <div className="text-center text-xs sm:text-sm text-on-surface-variant pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="text-primary font-semibold hover:underline cursor-pointer transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
