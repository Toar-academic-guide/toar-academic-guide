import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv, isSupabaseConfigured } from './env';

let browserClient: SupabaseClient | null | undefined;

export { isSupabaseConfigured };

export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();

  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient(supabaseUrl!, supabasePublishableKey!);

  return browserClient;
}
