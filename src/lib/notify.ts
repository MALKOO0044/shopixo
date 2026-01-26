import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function saveNotification(input: { type: string; title: string; body?: string | null; meta?: any; status?: 'unread' | 'read' | 'archived' }) {
  const db = getAdmin();
  if (!db) return false;
  const row = {
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    meta: input.meta ?? null,
    status: input.status ?? 'unread',
  };
  const { error } = await db.from('notifications').insert(row);
  return !error;
}

export async function listNotifications(limit = 50): Promise<any[]> {
  const db = getAdmin();
  if (!db) return [];
  const { data } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
