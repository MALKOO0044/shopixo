-- Offline discover catalog snapshot tables (no external API dependency at runtime)

create table if not exists public.discover_catalog_products (
  pid text primary key,
  cj_sku text,
  category_id text,
  category_name text,
  name text not null,
  description text,
  overview text,
  product_info text,
  size_info text,
  product_note text,
  packing_list text,
  images jsonb not null default '[]'::jsonb,
  video_url text,
  video_source_url text,
  video_4k_url text,
  video_delivery_mode text,
  video_quality_gate_passed boolean,
  video_source_quality_hint text,
  available_sizes jsonb not null default '[]'::jsonb,
  available_colors jsonb not null default '[]'::jsonb,
  available_models jsonb not null default '[]'::jsonb,
  color_image_map jsonb,
  supplier_rating numeric(3,2),
  review_count integer,
  displayed_rating numeric(3,2),
  rating_confidence numeric(5,4),
  listed_num integer not null default 0,
  stock_total integer not null default 0,
  processing_days integer,
  delivery_days_min integer,
  delivery_days_max integer,
  min_price_usd numeric(12,4),
  max_price_usd numeric(12,4),
  avg_price_usd numeric(12,4),
  min_price_sar numeric(12,4),
  max_price_sar numeric(12,4),
  avg_price_sar numeric(12,4),
  product_weight_g numeric(12,4),
  pack_length numeric(12,4),
  pack_width numeric(12,4),
  pack_height numeric(12,4),
  material text,
  product_type text,
  origin_country text,
  hs_code text,
  discover_rank numeric(12,4) not null default 0,
  snapshot_version text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discover_catalog_variants (
  id bigserial primary key,
  pid text not null references public.discover_catalog_products(pid) on delete cascade,
  variant_id text not null,
  variant_sku text not null,
  variant_name text,
  variant_image text,
  size text,
  color text,
  stock_total integer not null default 0,
  cj_stock integer not null default 0,
  factory_stock integer not null default 0,
  variant_price_usd numeric(12,4),
  variant_price_sar numeric(12,4),
  shipping_price_usd numeric(12,4),
  shipping_price_sar numeric(12,4),
  total_cost_usd numeric(12,4),
  total_cost_sar numeric(12,4),
  sell_price_usd numeric(12,4),
  sell_price_sar numeric(12,4),
  profit_usd numeric(12,4),
  profit_sar numeric(12,4),
  margin_percent numeric(8,4),
  delivery_days text,
  logistic_name text,
  shipping_country_code text not null default 'US',
  shipping_method text not null default 'configured-cheapest',
  all_shipping_options jsonb,
  snapshot_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pid, variant_id, shipping_country_code, shipping_method)
);

create index if not exists discover_catalog_products_category_idx
  on public.discover_catalog_products(category_id);

create index if not exists discover_catalog_products_rank_idx
  on public.discover_catalog_products(discover_rank desc, pid asc);

create index if not exists discover_catalog_products_price_idx
  on public.discover_catalog_products(min_price_usd, max_price_usd);

create index if not exists discover_catalog_products_stock_idx
  on public.discover_catalog_products(stock_total desc);

create index if not exists discover_catalog_products_rating_idx
  on public.discover_catalog_products(displayed_rating desc);

create index if not exists discover_catalog_products_snapshot_idx
  on public.discover_catalog_products(snapshot_version, updated_at desc);

create index if not exists discover_catalog_variants_pid_idx
  on public.discover_catalog_variants(pid);

create index if not exists discover_catalog_variants_shipping_idx
  on public.discover_catalog_variants(shipping_country_code, shipping_method);

create index if not exists discover_catalog_variants_sku_idx
  on public.discover_catalog_variants(variant_sku);

create index if not exists discover_catalog_variants_snapshot_idx
  on public.discover_catalog_variants(snapshot_version, updated_at desc);

alter table public.discover_catalog_products enable row level security;
alter table public.discover_catalog_variants enable row level security;

drop policy if exists "Service role can manage discover_catalog_products" on public.discover_catalog_products;
create policy "Service role can manage discover_catalog_products" on public.discover_catalog_products
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "Service role can manage discover_catalog_variants" on public.discover_catalog_variants;
create policy "Service role can manage discover_catalog_variants" on public.discover_catalog_variants
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
