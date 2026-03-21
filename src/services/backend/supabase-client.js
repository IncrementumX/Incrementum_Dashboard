import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export function createSupabaseClient(config) {
  if (!config.supabase.url || !config.supabase.anonKey) {
    return null;
  }

  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
