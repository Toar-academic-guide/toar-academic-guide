import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const INTERNAL_ADMIN_EMAILS_KEY = 'INTERNAL_ADMIN_EMAILS';

export type InternalAdminAuthorization =
  | {
      status: 'admin';
      isAdmin: true;
      user: InternalAdminUser;
    }
  | {
      status: 'non_admin';
      isAdmin: false;
      user: InternalAdminUser;
    }
  | {
      status: 'unauthenticated' | 'supabase_unavailable';
      isAdmin: false;
    };

interface InternalAdminUser {
  id: string;
  email: string | null;
}

export function parseInternalAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => normalizeEmail(email))
      .filter((email): email is string => Boolean(email)),
  );
}

export async function getInternalAdminAuthorization(): Promise<InternalAdminAuthorization> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      status: 'supabase_unavailable',
      isAdmin: false,
    };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        status: 'unauthenticated',
        isAdmin: false,
      };
    }

    const normalizedEmail = normalizeEmail(user.email);
    const internalUser = {
      id: user.id,
      email: normalizedEmail,
    };
    const allowedEmails = parseInternalAdminEmails(process.env[INTERNAL_ADMIN_EMAILS_KEY]);

    if (normalizedEmail && allowedEmails.has(normalizedEmail)) {
      return {
        status: 'admin',
        isAdmin: true,
        user: internalUser,
      };
    }

    return {
      status: 'non_admin',
      isAdmin: false,
      user: internalUser,
    };
  } catch {
    return {
      status: 'unauthenticated',
      isAdmin: false,
    };
  }
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
