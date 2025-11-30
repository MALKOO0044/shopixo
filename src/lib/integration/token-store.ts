import { createClient } from '@supabase/supabase-js';
import { hasTable } from '@/lib/db-features';

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
  if (!url || !key) {
    console.log('[TokenStore] Missing env vars - URL:', !!url, 'KEY:', !!key);
    return null;
  }
  return createClient(url, key);
}

export async function loadToken(provider: ProviderKey): Promise<TokenStateRow | null> {
  console.log('[TokenStore] loadToken called for provider:', provider);
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.log('[TokenStore] loadToken: No admin client available');
    return null;
  }
  const tableExists = await hasTable('integration_tokens');
  if (!tableExists) {
    console.log('[TokenStore] loadToken: integration_tokens table does not exist');
    return null;
  }
  try {
    const { data, error } = await admin
      .from('integration_tokens')
      .select('provider, access_token, access_expiry, refresh_token, refresh_expiry, last_auth_call_at, updated_at')
      .eq('provider', provider)
      .maybeSingle();
    if (error) {
      console.log('[TokenStore] loadToken error:', error.message);
      return null;
    }
    console.log('[TokenStore] loadToken result:', data ? 'token found' : 'no token');
    return (data as TokenStateRow) || null;
  } catch (e: any) {
    console.log('[TokenStore] loadToken exception:', e?.message);
    return null;
  }
}

export async function saveToken(provider: ProviderKey, row: Partial<TokenStateRow>): Promise<void> {
  console.log('[TokenStore] saveToken called for provider:', provider);
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.log('[TokenStore] saveToken: No admin client available');
    return;
  }
  const tableExists = await hasTable('integration_tokens');
  if (!tableExists) {
    console.log('[TokenStore] saveToken: integration_tokens table does not exist');
    return;
  }
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
    const { error } = await admin.from('integration_tokens').upsert(payload, { onConflict: 'provider' });
    if (error) {
      console.log('[TokenStore] saveToken error:', error.message);
    } else {
      console.log('[TokenStore] saveToken success for provider:', provider);
    }
  } catch (e: any) {
    console.log('[TokenStore] saveToken exception:', e?.message);
  }
}
