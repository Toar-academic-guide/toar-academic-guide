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

import { createSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  supabase: SupabaseClient | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
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
        return { error: error ? translateAuthError(error.message) : null };
      },
      async signUp(email, password) {
        if (!supabase) {
          return { error: 'ההרשמה עדיין לא זמינה.' };
        }

        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error ? translateAuthError(error.message) : null };
      },
      async signOut() {
        if (!supabase) {
          return;
        }

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

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'האימייל או הסיסמה שגויים.';
  }

  if (normalized.includes('user already registered')) {
    return 'כבר קיים חשבון עם האימייל הזה.';
  }

  if (normalized.includes('password should be at least')) {
    return 'הסיסמה חייבת להכיל לפחות 6 תווים.';
  }

  if (normalized.includes('invalid email')) {
    return 'כתובת האימייל אינה תקינה.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'צריך לאשר את האימייל לפני ההתחברות.';
  }

  return 'אירעה שגיאה. נסה שוב.';
}

