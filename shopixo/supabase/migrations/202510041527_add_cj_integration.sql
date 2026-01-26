-- CJ integration schema additions (idempotent)

-- raw CJ payloads for auditing
create table if not exists public.raw_cj_responses (
  id bigserial primary key,
  product_id bigint not null,
  source text not null default 'cj',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- quick sync logs (best-effort)
create table if not exists public.sync_logs (
  id bigserial primary key,
  event text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- integration tokens for external providers (e.g., CJ)
create table if not exists public.integration_tokens (
  provider text primary key,
  access_token text,
  access_expiry timestamptz,
  refresh_token text,
  refresh_expiry timestamptz,
  last_auth_call_at timestamptz,
  updated_at timestamptz default now()
);

-- pricing policies (optional). if multiple rows, choose by collection or fallback to first.
create table if not exists public.pricing_policies (
  id bigserial primary key,
  collection text,
  margin numeric not null default 0.35,
  floor_sar numeric not null default 9,
  round_to numeric not null default 0.05,
  endings jsonb default '[0.95,0.99]'::jsonb,
  created_at timestamptz not null default now()
);

-- products.cj_product_id (if not present)
alter table if exists public.products
  add column if not exists cj_product_id text;

-- optional products columns used by sync
alter table if exists public.products
  add column if not exists images jsonb,
  add column if not exists video_url text,
  add column if not exists is_active boolean default true;

-- indexes (idempotent)
create index if not exists idx_products_cj_product_id on public.products (cj_product_id);
create index if not exists idx_product_variants_cj_sku on public.product_variants (cj_sku);
create index if not exists idx_orders_cj_order_no on public.orders (cj_order_no);

-- permissions are assumed to be managed via Supabase Policies; adjust as needed.
