import React, { useState } from 'react';
import { getAuthService } from '../services/authService';

type Mode = 'login' | 'signup';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-[130px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-secondary/10 rounded-full blur-[130px]"></div>
      </div>

      <div className="glass-card w-full max-w-sm p-8 shadow-glass-lg border border-pink-100/80 bg-white/90">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-gradient-to-br from-pink-100 to-lavender-100 rounded-2xl p-3 mb-3 shadow-2xs border border-pink-200/50">
            <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h1 className="font-bold text-2xl tracking-tight text-slate-800">
            SmartReceipt <span className="text-primary font-normal">Pro</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {mode === 'login' ? 'Sign in to manage your receipts' : 'Create an account to start scanning'}
          </p>
        </div>

        {confirmationSent ? (
          <div className="text-center space-y-4" role="status">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800 leading-relaxed">
              Almost there! We sent a confirmation link to <span className="font-bold">{email}</span>.
              Confirm your email address, then sign in.
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white/90 border border-pink-100 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs placeholder-slate-400"
                placeholder="you@company.com"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl bg-white/90 border border-pink-100 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs placeholder-slate-400"
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-600 leading-relaxed" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary h-11 text-sm font-semibold shadow-sm"
            >
              {isSubmitting
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        )}

        {!confirmationSent && (
          <div className="mt-5 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-primary hover:text-primary/80 font-bold transition-colors cursor-pointer"
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
                  className="text-primary hover:text-primary/80 font-bold transition-colors cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-pink-100/60 flex items-center justify-center gap-3 text-[10px] text-slate-400 font-medium">
          <span>AI Vision OCR</span>
          <span>•</span>
          <span>Encrypted Cloud</span>
          <span>•</span>
          <span>CSV Export</span>
        </div>
      </div>
    </div>
  );
}
