const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  null;
const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabasePublishableKey);

export function getSupabaseEnv() {
  return {
    supabaseUrl,
    supabasePublishableKey,
    publicAppUrl,
  };
}
