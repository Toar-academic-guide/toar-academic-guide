import { createSupabaseServerClient } from '@/lib/supabase/server';

import { ApiRouteError } from './errors';

export async function requireAuthenticatedUserId() {
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

  return user.id;
}
