-- Persistent deleted discover products registry
-- Authoritative exclusion table used by discover search and offline catalog import.

create table if not exists public.discover_deleted_products (
  pid text primary key,
  deleted_at timestamptz not null default now(),
  deleted_by text,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discover_deleted_products_deleted_at_idx
  on public.discover_deleted_products(deleted_at desc);

create index if not exists discover_deleted_products_updated_at_idx
  on public.discover_deleted_products(updated_at desc);

alter table public.discover_deleted_products enable row level security;

drop policy if exists "Service role can manage discover_deleted_products" on public.discover_deleted_products;
create policy "Service role can manage discover_deleted_products" on public.discover_deleted_products
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
