import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseAnonServer(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return null;
  }
  return createClient(url, anon);
}
