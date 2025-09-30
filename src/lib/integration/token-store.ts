import { createClient } from '@supabase/supabase-js';

export type ProviderKey = 'cj';

export type TokenStateRow = {
  provider: string;
  access_token: string | null;
  access_expiry: string | null;
  refresh_token: string | null;
  refresh_expiry: string | null;
  last_auth_call_at: string | null;
  updated_at?: string | null;
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function tableExists(admin: any, table: string): Promise<boolean> {
  try {
    const probe = await admin.from(table).select('*').limit(1);
    // @ts-ignore
    if (probe.error) return false;
    return true;
  } catch {
    return false;
  }
}

export async function loadToken(provider: ProviderKey): Promise<TokenStateRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  if (!(await tableExists(admin, 'integration_tokens'))) return null;
  try {
    const { data } = await admin
      .from('integration_tokens')
      .select('provider, access_token, access_expiry, refresh_token, refresh_expiry, last_auth_call_at, updated_at')
      .eq('provider', provider)
      .maybeSingle();
    return (data as TokenStateRow) || null;
  } catch {
    return null;
  }
}

export async function saveToken(provider: ProviderKey, row: Partial<TokenStateRow>): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  if (!(await tableExists(admin, 'integration_tokens'))) return;
  try {
    const payload: TokenStateRow = {
      provider,
      access_token: row.access_token ?? null,
      access_expiry: row.access_expiry ?? null,
      refresh_token: row.refresh_token ?? null,
      refresh_expiry: row.refresh_expiry ?? null,
      last_auth_call_at: row.last_auth_call_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await admin.from('integration_tokens').upsert(payload, { onConflict: 'provider' });
  } catch {
    // ignore
  }
}
