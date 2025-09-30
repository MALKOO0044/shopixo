import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export type AdminGuard = { ok: true; user: any } | { ok: false; reason: string };

export async function ensureAdmin(): Promise<AdminGuard> {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    const allow = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!user) return { ok: false, reason: 'Not authenticated' };
    if (allow.length > 0 && !allow.includes((user.email || '').toLowerCase())) {
      return { ok: false, reason: 'Not authorized' };
    }
    return { ok: true, user };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'Auth error' };
  }
}
