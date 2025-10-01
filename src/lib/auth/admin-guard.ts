import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export type AdminGuard = { ok: true; user: any } | { ok: false; reason: string };

export async function ensureAdmin(): Promise<AdminGuard> {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return { ok: false, reason: 'Not authenticated' };

    const email = String(user.email || '').toLowerCase();
    const allowEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const allowDomains = (process.env.ADMIN_EMAIL_DOMAINS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    const appMeta = (user as any).app_metadata || {};
    const userMeta = (user as any).user_metadata || {};
    const roles = new Set<string>([
      ...((Array.isArray(appMeta.roles) ? appMeta.roles : []) as string[]),
      ...((Array.isArray(userMeta.roles) ? userMeta.roles : []) as string[]),
      String(appMeta.role || '').toLowerCase(),
      String(userMeta.role || '').toLowerCase(),
    ].filter(Boolean));

    const isAdminFlag = Boolean(appMeta.is_admin || userMeta.is_admin);

    const emailAllowed = allowEmails.length > 0 ? allowEmails.includes(email) : false;
    const domainAllowed = allowDomains.length > 0 && email.includes('@')
      ? allowDomains.includes(email.split('@')[1])
      : false;
    const roleAllowed = roles.has('admin');

    if (!(emailAllowed || domainAllowed || roleAllowed || isAdminFlag)) {
      return { ok: false, reason: 'Not authorized' };
    }

    return { ok: true, user };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'Auth error' };
  }
}
