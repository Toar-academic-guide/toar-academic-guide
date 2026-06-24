'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import posthog from 'posthog-js';

import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';

interface AuthResult {
  error: string | null;
}

export interface SignUpProfileIdentity {
  firstName: string;
  lastName: string;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  supabase: SupabaseClient | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signUp: (email: string, password: string, identity: SignUpProfileIdentity) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (nextSession?.user?.email) {
        posthog.identify(nextSession.user.id, { email: nextSession.user.email });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      supabase,
      async signInWithPassword(email, password) {
        if (!supabase) {
          return { error: 'ההתחברות עדיין לא זמינה.' };
        }

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? translateAuthError(error) : null };
      },
      async signInWithGoogle() {
        if (!supabase) {
          return { error: 'ההתחברות עדיין לא זמינה.' };
        }

        const { publicAppUrl } = getSupabaseEnv();
        const redirectTo = buildOAuthRedirectTo(
          publicAppUrl,
          typeof window === 'undefined' ? null : window.location.origin
        );

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: redirectTo ? { redirectTo } : undefined,
        });

        return {
          error: error ? 'לא הצלחנו להתחיל את ההתחברות עם Google. נסה שוב.' : null,
        };
      },
      async signUp(email, password, identity) {
        if (!supabase) {
          return { error: 'ההרשמה עדיין לא זמינה.' };
        }

        const { publicAppUrl } = getSupabaseEnv();
        const emailRedirectTo = buildEmailRedirectTo(
          publicAppUrl,
          typeof window === 'undefined' ? null : window.location.origin
        );

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: identity.firstName,
              last_name: identity.lastName,
            },
            ...(emailRedirectTo ? { emailRedirectTo } : {}),
          },
        });

        const duplicateMessage = resolveSignupDuplicateMessage(data);
        if (duplicateMessage) {
          return { error: duplicateMessage };
        }

        const pendingMessage = resolvePendingSignupMessage(data);
        if (pendingMessage) {
          return { error: pendingMessage };
        }

        return { error: error ? translateAuthError(error) : null };
      },
      async signOut() {
        if (!supabase) {
          return;
        }

        posthog.capture('user_signed_out');
        posthog.reset();
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [loading, session, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}

interface AuthErrorLike {
  code?: string | null;
  message?: string | null;
}

interface SignUpDataLike {
  user?: {
    identities?: unknown[] | null;
    created_at?: string | null;
    confirmation_sent_at?: string | null;
  } | null;
  session?: Session | null;
}

export function buildEmailRedirectTo(configuredAppUrl: string | null, browserOrigin: string | null) {
  const candidate = resolveRedirectOrigin(configuredAppUrl, browserOrigin);
  if (!candidate) {
    return undefined;
  }

  try {
    return new URL(candidate).toString();
  } catch {
    return undefined;
  }
}

export function buildOAuthRedirectTo(configuredAppUrl: string | null, browserOrigin: string | null) {
  const candidate = resolveRedirectOrigin(configuredAppUrl, browserOrigin);
  if (!candidate) {
    return undefined;
  }

  try {
    return new URL('/auth/callback', candidate).toString();
  } catch {
    return undefined;
  }
}

function resolveRedirectOrigin(configuredAppUrl: string | null, browserOrigin: string | null) {
  return configuredAppUrl?.trim() || browserOrigin?.trim() || undefined;
}

export function resolveSignupDuplicateMessage(data: SignUpDataLike | undefined): string | null {
  if (!data || data.session || !data.user) {
    return null;
  }

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return 'כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם שוב.';
  }

  return null;
}

export function resolvePendingSignupMessage(data: SignUpDataLike | undefined): string | null {
  if (!data || data.session || !data.user?.created_at || !data.user.confirmation_sent_at) {
    return null;
  }

  const createdAt = Date.parse(data.user.created_at);
  const confirmationSentAt = Date.parse(data.user.confirmation_sent_at);

  if (Number.isNaN(createdAt) || Number.isNaN(confirmationSentAt)) {
    return null;
  }

  if (confirmationSentAt - createdAt > 30_000) {
    return 'כבר התחלת הרשמה עם האימייל הזה. פתח את מייל האישור ואז התחבר.';
  }

  return null;
}

export function translateAuthError(error: string | AuthErrorLike): string {
  const message = typeof error === 'string' ? error : error.message ?? '';
  const code = typeof error === 'string' ? '' : error.code?.toLowerCase() ?? '';
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'האימייל או הסיסמה שגויים.';
  }

  if (normalized.includes('user already registered')) {
    return 'כבר קיים חשבון עם האימייל הזה. נסה להתחבר במקום להירשם שוב.';
  }

  if (normalized.includes('password should be at least')) {
    return 'הסיסמה חייבת להכיל לפחות 6 תווים.';
  }

  if (normalized.includes('invalid email')) {
    return 'כתובת האימייל אינה תקינה.';
  }

  if (code === 'email_not_confirmed' || normalized.includes('email not confirmed')) {
    return 'צריך לאשר את האימייל לפני ההתחברות.';
  }

  if (
    code.includes('rate') ||
    normalized.includes('rate limit') ||
    normalized.includes('security purposes') ||
    normalized.includes('too many requests')
  ) {
    return 'כבר שלחנו מייל אימות לאחרונה. חכה רגע ונסה שוב.';
  }

  return 'אירעה שגיאה. נסה שוב.';
}
