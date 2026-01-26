-- Integration tokens table for external provider access tokens (e.g., CJ)
-- Generated on 2025-10-02 00:46 (+03:00)

create table if not exists public.integration_tokens (
  provider text primary key,
  access_token text null,
  access_expiry timestamptz null,
  refresh_token text null,
  refresh_expiry timestamptz null,
  last_auth_call_at timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.integration_tokens enable row level security;

drop policy if exists "Service role can manage integration_tokens" on public.integration_tokens;
create policy "Service role can manage integration_tokens" on public.integration_tokens
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
