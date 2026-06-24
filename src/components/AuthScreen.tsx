'use client';

import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import posthog from 'posthog-js';

import { useAuth } from '@/context/AuthContext';
import { saveUserProfileIdentityDraft } from '@/hooks/useUserProfile';
import LogoCanvas from './LogoCanvas';
import NeoButton from './NeoButton';

interface AuthScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'signup';

export default function AuthScreen({ onBack, onSuccess }: AuthScreenProps) {
  const { configured, signInWithGoogle, signInWithPassword, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError('יש למלא אימייל וסיסמה.');
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (mode === 'signup' && (!trimmedFirstName || !trimmedLastName)) {
      setError('יש למלא שם פרטי ושם משפחה.');
      return;
    }

    setSubmitting(true);
    const result =
      mode === 'login'
        ? await signInWithPassword(email.trim(), password)
        : await signUp(email.trim(), password, {
            firstName: trimmedFirstName,
            lastName: trimmedLastName,
          });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === 'signup') {
      saveUserProfileIdentityDraft({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      });
      posthog.capture('user_signed_up', { email: email.trim() });
      setInfo('שלחנו מייל לאישור החשבון. אשר אותו ואז חזור להתחבר.');
      setMode('login');
      setPassword('');
      return;
    }

    posthog.capture('user_signed_in', { email: email.trim() });
    onSuccess();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const result = await signInWithGoogle();
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: '#f5f4f0' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <LogoCanvas size={84} brighten={false} />
        </div>

        <h1 className="mb-1 text-center text-2xl font-black text-slate-900">
          {mode === 'login' ? 'התחברות' : 'יצירת חשבון'}
        </h1>
        <p className="mb-6 text-center text-sm text-slate-500">
          {mode === 'login'
            ? 'התחבר כדי לשמור את הנתונים שלך ולסנכרן בין מכשירים.'
            : 'צור חשבון כדי לשמור את הפרופיל ואת רשימת הייעוד שלך.'}
        </p>

        {!configured && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ההתחברות עדיין לא הוגדרה בסביבה הזו. אפשר להמשיך להשתמש באפליקציה כאורחת.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' ? (
            <>
              <label className="relative block">
                <input
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="שם פרטי"
                  className="h-12 w-full rounded-full border-2 border-black bg-white px-4 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                />
              </label>

              <label className="relative block">
                <input
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="שם משפחה"
                  className="h-12 w-full rounded-full border-2 border-black bg-white px-4 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                />
              </label>
            </>
          ) : null}

          <label className="relative block">
            <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              dir="ltr"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-full border-2 border-black bg-white px-4 pr-12 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            />
          </label>

          <label className="relative block">
            <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-12 w-full rounded-full border-2 border-black bg-white px-4 pl-12 pr-12 text-base text-slate-900 placeholder-slate-400 outline-none transition focus:shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}

          {info ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              {info}
            </p>
          ) : null}

          <NeoButton
            type="submit"
            variant="cyan-filled"
            disabled={submitting || !configured}
            className="mt-1 h-12 w-full text-base"
            ariaLabel={mode === 'login' ? 'התחבר' : 'צור חשבון'}
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : mode === 'login' ? (
              'התחבר'
            ) : (
              'צור חשבון'
            )}
          </NeoButton>

          <NeoButton
            type="button"
            variant="ghost"
            disabled={submitting || !configured}
            onClick={() => void handleGoogleSignIn()}
            className="h-12 w-full text-base"
            ariaLabel="המשך עם Google"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'המשך עם Google'}
          </NeoButton>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode((current) => (current === 'login' ? 'signup' : 'login'));
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-sm text-slate-600 transition hover:text-slate-900"
        >
          {mode === 'login' ? 'אין לך חשבון? צור חשבון' : 'כבר יש לך חשבון? התחבר'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-700"
        >
          <ArrowRight size={15} />
          חזרה
        </button>
      </div>
    </div>
  );
}
