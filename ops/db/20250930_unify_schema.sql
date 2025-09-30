-- Unify Shopixo DB schema for CJ + Products + Variants + Token store
-- Safe/idempotent: uses IF EXISTS/IF NOT EXISTS and DO blocks

-- 1) integration_tokens
create table if not exists public.integration_tokens (
  provider text primary key,
  access_token text,
  access_expiry timestamptz,
  refresh_token text,
  refresh_expiry timestamptz,
  last_auth_call_at timestamptz,
  updated_at timestamptz default now()
);

-- 2) products: ensure optional columns exist
alter table if exists public.products
  add column if not exists description text,
  add column if not exists category text default 'General'::text,
  add column if not exists is_active boolean default true,
  add column if not exists video_url text,
  add column if not exists processing_time_hours integer,
  add column if not exists delivery_time_hours integer,
  add column if not exists origin_area text,
  add column if not exists origin_country_code text,
  add column if not exists free_shipping boolean,
  add column if not exists inventory_shipping_fee numeric,
  add column if not exists last_mile_fee numeric,
  add column if not exists cj_product_id text,
  add column if not exists shipping_from text;

-- images column as text[] when missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='images'
  ) THEN
    ALTER TABLE public.products ADD COLUMN images text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- helpful indexes
create unique index if not exists products_slug_uniq on public.products(slug);
create index if not exists products_category_idx on public.products(category);
create index if not exists products_cj_product_id_idx on public.products(cj_product_id);

-- 3) product_variants
create table if not exists public.product_variants (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  option_name text not null,
  option_value text not null,
  cj_sku text,
  cj_variant_id text,
  price numeric,
  stock integer not null default 0
);
create unique index if not exists product_variants_unique_opt on public.product_variants(product_id, option_name, option_value);
create index if not exists product_variants_cj_sku_idx on public.product_variants(cj_sku);
create index if not exists product_variants_product_id_idx on public.product_variants(product_id);

-- 4) recompute_product_stock function
create or replace function public.recompute_product_stock(product_id_in bigint)
returns void language plpgsql as $$
begin
  update public.products p
  set stock = coalesce(v.sum_stock, 0)
  from (
    select product_id, sum(stock)::int as sum_stock
    from public.product_variants
    where product_id = product_id_in
    group by product_id
  ) v
  where p.id = product_id_in;
end; $$;

-- 5) orders helpful columns for CJ tracking (if not there)
alter table if exists public.orders
  add column if not exists cj_order_no text,
  add column if not exists shipping_status text,
  add column if not exists tracking_number text,
  add column if not exists carrier text;

create index if not exists orders_cj_order_no_idx on public.orders(cj_order_no);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_shipping_status_idx on public.orders(shipping_status);
