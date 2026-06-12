import React, { useState } from 'react';
import { getAuthService } from '../services/authService';

type Mode = 'login' | 'signup';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const auth = getAuthService();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationSent(false);

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { session } = await auth.signUp(email.trim(), password);
        // With email confirmation enabled, no session is returned until confirmed.
        if (!session) {
          setConfirmationSent(true);
        }
      } else {
        await auth.signIn(email.trim(), password);
        // On success, the App auth-state listener swaps in the dashboard.
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setConfirmationSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-slate-700 font-sans">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/8 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/8 rounded-full blur-[120px]"></div>
      </div>

      <div className="glass-card w-full max-w-sm p-7 shadow-glass-lg border-pink-100">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-lavender-50 rounded-xl p-2.5 mb-3">
            <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h1 className="font-semibold text-xl tracking-tight text-slate-800">
            SmartReceipt <span className="text-primary font-normal">Pro</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {confirmationSent ? (
          <div className="text-center space-y-4" role="status">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-700">
              Almost there! We sent a confirmation link to <span className="font-semibold">{email}</span>.
              Confirm your email, then sign in.
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-primary hover:text-primary/70 transition-colors cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/70 border border-pink-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="you@example.com"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/70 border border-pink-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="••••••••"
                disabled={isSubmitting}
                required
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-600" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              {isSubmitting
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        )}

        {!confirmationSent && (
          <div className="mt-5 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-primary hover:text-primary/70 font-medium transition-colors cursor-pointer"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-primary hover:text-primary/70 font-medium transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
