import { createSupabaseServerClient } from '@/lib/supabase/server';

import { ApiRouteError } from './errors';

export async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    throw new ApiRouteError(503, 'SUPABASE_AUTH_UNAVAILABLE', 'Supabase auth is not configured.');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiRouteError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  }

  return user;
}

export async function requireAuthenticatedUserId() {
  return (await requireAuthenticatedUser()).id;
}

export async function requireVerifiedEmailUser() {
  const user = await requireAuthenticatedUser();
  if (!user.email || !user.email_confirmed_at || user.is_anonymous) {
    throw new ApiRouteError(
      403,
      'VERIFIED_EMAIL_REQUIRED',
      'Verify your account email before activating alerts.',
    );
  }
  return user;
}
