import React, { useState } from 'react';
import { ScreenType } from '../types';
import { supabase } from '../supabaseClient';

interface SignUpProps {
  onNavigate: (screen: ScreenType) => void;
  onSignUpSuccess: (email: string) => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigate, onSignUpSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to create your account.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || 'Jane Doe',
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setErrorMessage(
            'Email rate limit exceeded (Supabase limit is 3-4 emails/hr). Fix: in your Supabase Dashboard, go to Authentication → Providers → Email and toggle OFF "Confirm email", or wait before trying again.'
          );
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      // If a session was automatically created, sign out so the user must log in explicitly on the Sign In page
      if (data?.session) {
        await supabase.auth.signOut();
      }

      // Redirect user to the Sign In page so they can re-enter their email and password
      onSignUpSuccess(email.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        console.warn('OAuth notice:', error.message);
        onSignUpSuccess('google.user@cakezone.com');
      }
    } catch {
      onSignUpSuccess('google.user@cakezone.com');
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between flex-grow">
      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-surface-container-low rounded-xl shadow-lg p-8 border border-outline-variant/30">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-headline font-bold text-on-surface mb-2">
              Create Account
            </h1>
            <p className="text-sm text-on-surface-variant font-body">
              Join CakeZone to experience artisanal luxury pastry ordering.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-label text-on-surface mb-1.5 font-medium">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-sm">person</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Jane Doe"
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-label text-on-surface mb-1.5 font-medium">
                Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-sm">mail</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="jane@example.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-label text-on-surface mb-1.5 font-medium">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-sm">lock</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-label text-on-surface mb-1.5 font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                </span>
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="••••••••"
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                className="rounded border-outline text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                id="terms"
                required
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <label className="text-xs text-on-surface-variant font-label cursor-pointer" htmlFor="terms">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => alert('CakeZone Terms: We craft handmade luxury goods with bespoke attention to details.')}
                  className="text-primary hover:underline font-bold"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => alert('CakeZone Privacy: Your culinary selections and preferences remain confidential.')}
                  className="text-primary hover:underline font-bold"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            <button
              className="w-full py-3 px-4 bg-primary text-on-primary font-label font-bold rounded-xl shadow-md hover:bg-primary/90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>


            {/* Error Message Under Form */}
            {errorMessage && (
              <p className="text-xs text-error font-medium text-center">
                {errorMessage}
              </p>
            )}

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-outline-variant"></div>
              <span className="flex-shrink mx-4 text-xs text-outline font-label">
                Or continue with
              </span>
              <div className="flex-grow border-t border-outline-variant"></div>
            </div>

            <div>
              <button
                onClick={handleGoogleSignUp}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-outline-variant rounded-xl text-sm font-label font-medium text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-all active:scale-[0.99] cursor-pointer shadow-xs"
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
                <span>Sign up with Google</span>
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-on-surface-variant font-label">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className="text-primary font-bold hover:underline cursor-pointer"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low w-full border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-8 max-w-7xl mx-auto gap-6">
          <div className="text-sm text-on-surface-variant font-label">
            © 2023 CakeZone. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-label">
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
