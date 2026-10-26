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
  const [isRecovery, setIsRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery') ||
        window.location.pathname === '/update-password'
      );
    }
    return false;
  });
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check if an active recovery session already exists when the page mounts
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecovery(true);
      }
    });

    // Listen for the PASSWORD_RECOVERY event using supabase.auth.onAuthStateChange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => {
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

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      onPasswordUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while updating your password.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow pt-2 sm:pt-4">
      <main className="flex-grow flex items-center justify-center px-4 pt-2 sm:pt-4 pb-12">
        <div className="relative w-full max-w-md bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-2xl border border-outline-variant/60 p-8 sm:p-10 transition-all duration-300 -mt-2 sm:-mt-5 overflow-hidden">
          {/* Subtle Top Luxury Accent Stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3 shadow-xs">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">
              Update Password
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
              Enter your new password below to secure your CakeZone account.
            </p>
          </div>

          {isRecovery ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </span>
                  <input
                    className="w-full pl-11 pr-4 py-3 bg-surface border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                className="w-full py-3.5 px-4 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </button>

              <div className="text-center text-sm text-on-surface-variant pt-2">
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
            <div className="text-center space-y-4 py-4">
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Verifying your password recovery link...
              </p>
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className="text-primary text-xs font-semibold hover:underline cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};


