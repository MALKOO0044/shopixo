-- Admin Console Core: kv_settings, proposals, audit_logs, pricing_policies (idempotent)

-- 1) Key-Value settings
create table if not exists public.kv_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.kv_settings enable row level security;
drop policy if exists "Service role can manage kv_settings" on public.kv_settings;
create policy "Service role can manage kv_settings" on public.kv_settings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 2) Proposals review queue
create extension if not exists pgcrypto;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected','executed')),
  action_type text,
  entity_type text,
  entity_id text,
  score numeric,
  reasons jsonb,
  impact jsonb,
  payload jsonb,
  proposed_by text,
  mode text,
  tags text[]
);

create index if not exists proposals_status_created_at_idx on public.proposals(status, created_at desc);

alter table public.proposals enable row level security;
drop policy if exists "Service role can manage proposals" on public.proposals;
create policy "Service role can manage proposals" on public.proposals
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 3) Audit logs
create table if not exists public.audit_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  action text not null,
  entity text,
  entity_id text,
  user_email text,
  user_id text,
  payload jsonb
);

create index if not exists audit_logs_action_created_idx on public.audit_logs(action, created_at desc);

alter table public.audit_logs enable row level security;
drop policy if exists "Service role can manage audit_logs" on public.audit_logs;
create policy "Service role can manage audit_logs" on public.audit_logs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 4) Pricing policies (optional, referenced by DB status)
create table if not exists public.pricing_policies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rule_name text not null,
  enabled boolean not null default true,
  config jsonb
);

create index if not exists pricing_policies_created_idx on public.pricing_policies(created_at desc);

alter table public.pricing_policies enable row level security;
drop policy if exists "Service role can manage pricing_policies" on public.pricing_policies;
create policy "Service role can manage pricing_policies" on public.pricing_policies
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
