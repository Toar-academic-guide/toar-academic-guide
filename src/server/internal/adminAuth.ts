import 'server-only';

import { headers } from 'next/headers';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const INTERNAL_ADMIN_EMAILS_KEY = 'INTERNAL_ADMIN_EMAILS';
const INTERNAL_ADMIN_E2E_EMAIL_KEY = 'INTERNAL_ADMIN_E2E_EMAIL';
const INTERNAL_ADMIN_E2E_TOKEN_KEY = 'INTERNAL_ADMIN_E2E_TOKEN';
const INTERNAL_ADMIN_E2E_HEADER = 'x-internal-admin-e2e-token';

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
  const ciE2EAuthorization = await getCiE2EAdminAuthorization();
  if (ciE2EAuthorization) {
    return ciE2EAuthorization;
  }

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

async function getCiE2EAdminAuthorization(): Promise<InternalAdminAuthorization | null> {
  if (process.env.CI !== 'true' || process.env.VERCEL === '1') {
    return null;
  }

  const expectedToken = process.env[INTERNAL_ADMIN_E2E_TOKEN_KEY]?.trim();
  const normalizedEmail = normalizeEmail(process.env[INTERNAL_ADMIN_E2E_EMAIL_KEY]);

  if (!expectedToken || !normalizedEmail) {
    return null;
  }

  try {
    const requestHeaders = await headers();
    const actualToken = requestHeaders.get(INTERNAL_ADMIN_E2E_HEADER)?.trim();

    if (actualToken !== expectedToken) {
      return null;
    }

    return {
      status: 'admin',
      isAdmin: true,
      user: {
        id: 'ci-e2e-internal-admin',
        email: normalizedEmail,
      },
    };
  } catch {
    return null;
  }
}

function normalizeEmail(email: null | string | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
