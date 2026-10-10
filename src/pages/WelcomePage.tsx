import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TactileButton } from '../components/ui/TactileButton';
import { RecoveryCodeModal } from '../components/ui/RecoveryCodeModal';

export const WelcomePage: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { signIn, signUp, resetPin, recoveryCode, setRecoveryCode } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signup');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!username.trim()) throw new Error('Username is required.');
        if (!email.trim() || !email.includes('@')) throw new Error('Valid email is required.');
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) throw new Error('PIN must be 6 digits.');

        const res = await signUp(username, pin, email);
        if (res.error) throw new Error(res.error);
      } else if (mode === 'signin') {
        if (!username.trim()) throw new Error('Username is required.');
        if (pin.length !== 6) throw new Error('PIN must be 6 digits.');

        const res = await signIn(username, pin);
        if (res.error) throw new Error(res.error);
        if (onComplete) onComplete();
      } else if (mode === 'reset') {
        if (!username.trim()) throw new Error('Username is required.');
        if (!resetCode.trim()) throw new Error('Recovery code is required.');
        if (newPin.length !== 6) throw new Error('New PIN must be 6 digits.');

        const res = await resetPin(username, resetCode, newPin);
        if (res.error) throw new Error(res.error);
        setSuccessMessage('PIN reset successfully! You can now sign in.');
        setMode('signin');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface flex flex-col justify-between p-4 max-w-md mx-auto relative overflow-hidden">
      {/* Background neon arcade glow */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-32 w-80 h-80 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="pt-8 flex flex-col items-center text-center z-10">
        <div className="w-18 h-18 rounded-3xl bg-primary flex items-center justify-center text-4xl shadow-[0_4px_0_0_#4500D8] mb-4">
          🧢
        </div>
        <h1 className="font-display-lg text-3xl text-on-surface font-extrabold tracking-tight">
          Goalstreet
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant max-w-xs mt-1">
          Tactile Football Stock Market. Trade players with 10,000 Caps free starting liquidity.
        </p>

        {/* Feature Pill Row */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-[11px] font-bold">
            ⚡ Play Money Only
          </span>
          <span className="px-2.5 py-1 rounded-full bg-secondary-fixed/50 text-on-secondary-fixed text-[11px] font-bold">
            🧢 10,000 Caps Gift
          </span>
          <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed/60 text-tertiary text-[11px] font-bold">
            🏆 Weekly Cups
          </span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="w-full bg-surface-container-lowest rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06),0_3px_0_0_#E9E8E4] z-10 my-6">
        <div className="flex border-b border-surface-container-high pb-3 mb-5">
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); }}
            className={`flex-1 text-center font-headline-sm text-sm pb-2 border-b-2 transition-all ${
              mode === 'signup'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMessage(null); }}
            className={`flex-1 text-center font-headline-sm text-sm pb-2 border-b-2 transition-all ${
              mode === 'signin'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="font-label-ui text-xs text-on-surface-variant font-medium">
              Trader Username
            </label>
            <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/40 focus-within:border-primary">
              <span className="material-symbols-outlined text-outline text-[18px] mr-2">person</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. striker99"
                className="w-full bg-transparent text-sm text-on-surface focus:outline-none font-medium"
              />
            </div>
          </div>

          {/* Email (only for signup) */}
          {mode === 'signup' && (
            <div className="flex flex-col gap-1">
              <label className="font-label-ui text-xs text-on-surface-variant font-medium">
                Email Address (Unverified)
              </label>
              <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/40 focus-within:border-primary">
                <span className="material-symbols-outlined text-outline text-[18px] mr-2">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full bg-transparent text-sm text-on-surface focus:outline-none font-medium"
                />
              </div>
            </div>
          )}

          {/* PIN */}
          {mode !== 'reset' && (
            <div className="flex flex-col gap-1">
              <label className="font-label-ui text-xs text-on-surface-variant font-medium">
                6-Digit Security PIN
              </label>
              <div className="flex items-center bg-surface-container-low rounded-xl px-3 py-2.5 border border-outline-variant/40 focus-within:border-primary">
                <span className="material-symbols-outlined text-outline text-[18px] mr-2">pin</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-transparent text-sm text-on-surface focus:outline-none font-label-ticker tracking-widest"
                />
              </div>
            </div>
          )}

          {/* Reset Fields */}
          {mode === 'reset' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="font-label-ui text-xs text-on-surface-variant font-medium">
                  Recovery Code
                </label>
                <input
                  type="text"
                  required
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                  placeholder="GS-XXXX-XXXX"
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm font-label-ticker text-on-surface focus:outline-none border border-outline-variant/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-ui text-xs text-on-surface-variant font-medium">
                  New 6-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm font-label-ticker tracking-widest text-on-surface focus:outline-none border border-outline-variant/40"
                />
              </div>
            </>
          )}

          {errorMessage && (
            <div className="text-xs text-error bg-error/10 p-2.5 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="text-xs text-tertiary-container bg-tertiary-container/10 p-2.5 rounded-xl font-medium">
              {successMessage}
            </div>
          )}

          <TactileButton fullWidth size="lg" variant="primary" disabled={loading} type="submit">
            {loading
              ? 'Securing...'
              : mode === 'signup'
              ? 'Claim 10,000 Caps & Start Trading'
              : mode === 'signin'
              ? 'Unlock Terminal'
              : 'Reset My PIN'}
          </TactileButton>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => { setMode('reset'); setErrorMessage(null); }}
              className="text-xs text-on-surface-variant hover:text-primary text-center mt-1"
            >
              Forgot 6-digit PIN? Use Recovery Code
            </button>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); }}
              className="text-xs text-on-surface-variant hover:text-primary text-center mt-1"
            >
              ← Back to Sign In
            </button>
          )}
        </form>
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-center text-xs text-on-surface-variant z-10">
        Free play-money fantasy exchange • No real money wagering
      </div>

      {/* Recovery Code Display upon successful signup */}
      {recoveryCode && (
        <RecoveryCodeModal
          code={recoveryCode}
          onDismiss={() => {
            setRecoveryCode(null);
            if (onComplete) onComplete();
          }}
        />
      )}
    </div>
  );
};
