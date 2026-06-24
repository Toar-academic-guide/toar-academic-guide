import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv, isSupabaseConfigured } from './env';

export const isSupabaseServerConfigured = isSupabaseConfigured;

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseServerConfigured) {
    return null;
  }

  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();

  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot always mutate cookies directly.
        }
      },
    },
  });
}
