import React, { useState } from 'react';
import { ScreenType } from '../types';
import { supabase, signInWithGoogle } from '../supabaseClient';
import { registerKnownAccountEmail } from '../services/supabaseData';

interface SignUpProps {
  onNavigate: (screen: ScreenType) => void;
  onSignUpSuccess?: (email: string) => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigate, onSignUpSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'terms' | 'privacy' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();

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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('cakezone_signup_in_progress', 'true');
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim() || 'Jane Doe',
          },
        },
      });

      if (error) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('cakezone_signup_in_progress');
        }
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

      await registerKnownAccountEmail(trimmedEmail, fullName.trim() || 'Jane Doe', data?.user?.id);

      // Do NOT auto-login: if Supabase returned a session, sign out immediately
      if (data?.session) {
        await supabase.auth.signOut();
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cakezone_signup_in_progress');
        sessionStorage.setItem('cakezone_signup_email', trimmedEmail);
        sessionStorage.setItem('cakezone_signup_success', 'true');
        window.history.pushState(
          { email: trimmedEmail, signupSuccess: true },
          '',
          `/login?email=${encodeURIComponent(trimmedEmail)}&signup=success`
        );
      }

      // Redirect user to the Sign In page with their email pre-filled
      if (onSignUpSuccess) {
        onSignUpSuccess(trimmedEmail);
      } else {
        onNavigate('signin');
      }
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('cakezone_signup_in_progress');
      }
      setErrorMessage(err.message || 'An unexpected error occurred during sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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
      {/* Main Content Canvas */}
      <main className="flex-grow flex items-start justify-center px-4 pt-1.5 sm:pt-2 pb-4">
        <div className="relative w-full max-w-md -mt-0.5 bg-[#fbf6f1] rounded-2xl shadow-xl hover:shadow-2xl border border-outline-variant/60 px-6 sm:px-9 pt-5 sm:pt-6 pb-7 sm:pb-8 transition-all duration-300 overflow-hidden">
          {/* Subtle Top Luxury Accent Stripe */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30 z-10" />

          <div className="relative z-10 text-center mb-5">
            <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2.5 shadow-xs">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-bold text-on-surface tracking-tight mb-1.5">
              Create Account
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-xs mx-auto">
              Join CakeZone to experience artisanal luxury pastry ordering.
            </p>
          </div>

          <form className="relative z-10 space-y-3.5 sm:space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-lg">person</span>
                </span>
                <input
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white/95 border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  placeholder="Jane Doe"
                  required
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-outline pointer-events-none">
                  <span className="material-symbols-outlined text-lg">mail</span>
                </span>
                <input
                  className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white/95 border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                  placeholder="name@gmail.com"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </span>
                  <input
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-white/95 border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-outline pointer-events-none">
                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                  </span>
                  <input
                    className="w-full pl-10 pr-3 py-2.5 sm:py-3 bg-white/95 border border-outline-variant/70 rounded-xl text-on-surface text-sm placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                className="rounded border-outline/70 text-primary focus:ring-primary/20 focus:ring-2 w-4 h-4 cursor-pointer accent-primary shrink-0"
                id="terms"
                required
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <label className="text-xs text-on-surface-variant font-medium select-none cursor-pointer leading-relaxed" htmlFor="terms">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActivePolicyModal('terms');
                  }}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActivePolicyModal('privacy');
                  }}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            <button
              className="w-full py-3 sm:py-3.5 px-4 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:bg-primary/95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed group"
              type="submit"
              disabled={loading}
            >
              <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </button>

            {/* Error Message Under Form */}
            {errorMessage && (
              <div className="p-3 bg-white/95 border border-error/20 rounded-xl">
                <p className="text-xs text-error font-medium text-center leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-outline-variant/60"></div>
              <span className="flex-shrink mx-4 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                or continue with
              </span>
              <div className="flex-grow border-t border-outline-variant/60"></div>
            </div>

            <div>
              <button
                onClick={handleGoogleSignUp}
                className="w-full flex items-center justify-center gap-3 py-2.5 sm:py-3 px-4 bg-white/95 hover:bg-white border border-outline-variant/80 hover:border-outline rounded-xl text-sm font-label font-medium text-on-surface shadow-xs hover:shadow-sm transition-all active:scale-[0.99] cursor-pointer"
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

          <div className="relative z-10 text-center mt-4">
            <p className="text-xs sm:text-sm text-on-surface font-label font-medium">
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

          <img
            src="/assets/aistudio/image_44949a6b.png"
            alt=""
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[106%] max-w-none pointer-events-none select-none z-0"
          />
        </div>
      </main>

      {/* Small Window Modal for Terms of Service & Privacy Policy */}
      {activePolicyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-surface-container-lowest max-w-md w-full p-5 sm:p-6 rounded-2xl shadow-2xl border border-outline-variant space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/60 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-on-surface">
                <strong>
                  {activePolicyModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </strong>
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto pr-1 text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-2">
              {activePolicyModal === 'terms' ? (
                <p>
                  By accessing and using the CakeZone website, you agree to our terms and conditions. Customers must provide accurate information when placing orders for cakes, bakery products, or custom cake designs. All orders are subject to product availability, price confirmation, and acceptance by CakeZone. Product appearance may vary slightly from displayed images. We offer home delivery and store pickup where available, subject to confirmation. Customers should contact us promptly for order cancellations, modifications, refunds, or complaints, as eligibility may depend on the order status and applicable policies. Customers are responsible for checking their order details, delivery information, and customization requests before confirmation. All website content, branding, images, and designs are protected by applicable intellectual property laws. CakeZone reserves the right to update website content and these terms as necessary. Use of the website is also subject to our Privacy Policy and applicable laws of India. For assistance, please contact CakeZone through our official support channels.
                </p>
              ) : (
                <p>
                  At CakeZone, we respect your privacy and are committed to protecting your personal information. We may collect details such as your name, phone number, email address, delivery address, and order preferences to process cake orders, manage custom cake requests, arrange home delivery or store pickup, and provide customer support. If you place an order through WhatsApp or use third-party payment services, relevant information may be processed by those platforms under their respective privacy policies. We use reasonable security measures to protect your information and do not sell personal data as a business practice. Your information may be shared with trusted service providers when necessary to fulfil orders or comply with legal obligations. We retain personal information only as long as reasonably necessary for business and legal purposes. Subject to applicable law, you may request access to, correction of, or deletion of your personal information by contacting CakeZone through our official support channels. By using our website, you acknowledge this Privacy Policy and its terms, subject to any consent required by applicable Indian law.
                </p>
              )}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="w-full py-2.5 bg-primary text-on-primary text-xs sm:text-sm font-bold rounded-xl cursor-pointer hover:bg-primary/90 transition-all shadow-sm"
              >
                Continue
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
