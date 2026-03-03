-- Variants and shipping metadata, CJ linkage, and stock sync groundwork
-- Generated on 2025-09-27 16:47 (+03:00)

-- 1) Product variants table (per-size stock/sku/price)
create table if not exists public.product_variants (
  id bigserial primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  option_name text not null default 'Size',
  option_value text not null, -- e.g. S, M, L, XL, XXL, XXXL
  cj_sku text null,           -- CJ variant code (e.g., CJNZ248962603CX)
  cj_variant_id text null,    -- Optional CJ internal variant ID if available
  price numeric(12,2) null,   -- Optional per-variant price; if null, use products.price
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);
create unique index if not exists uq_product_variants_product_option on public.product_variants(product_id, option_name, option_value);
create index if not exists idx_product_variants_product on public.product_variants(product_id);

-- Enable RLS and policies similar to products
alter table public.product_variants enable row level security;
drop policy if exists "Public can read product_variants" on public.product_variants;
create policy "Public can read product_variants" on public.product_variants for select using (true);
drop policy if exists "Service role can manage product_variants" on public.product_variants;
create policy "Service role can manage product_variants" on public.product_variants for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 2) Extend products with shipping metadata and CJ linkage (idempotent)
alter table public.products add column if not exists video_url text;
alter table public.products add column if not exists processing_time_hours integer;
alter table public.products add column if not exists delivery_time_hours integer;
alter table public.products add column if not exists origin_area text;
alter table public.products add column if not exists origin_country_code text;
alter table public.products add column if not exists free_shipping boolean not null default true;
alter table public.products add column if not exists inventory_shipping_fee numeric(12,2) not null default 0;
alter table public.products add column if not exists last_mile_fee numeric(12,2) not null default 0;
alter table public.products add column if not exists cj_product_id text;
alter table public.products add column if not exists shipping_from text;

-- 3) Extend cart_items and order_items to reference a specific variant
alter table public.cart_items add column if not exists variant_id bigint null references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_id bigint null references public.product_variants(id) on delete set null;

-- 4) RPCs for variant stock and product stock recompute
create or replace function public.decrement_variant_stock(variant_id_in bigint, quantity_in integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_variants
    set stock = greatest(stock - quantity_in, 0)
  where id = variant_id_in;
end;
$$;

create or replace function public.recompute_product_stock(product_id_in bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
    set stock = (
      select coalesce(sum(v.stock), 0)
      from public.product_variants v
      where v.product_id = p.id
    )
  where p.id = product_id_in;
end;
$$;

-- 5) Trigger to keep product.stock in sync with sum of its variants
create or replace function public.after_variant_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid bigint;
begin
  pid := coalesce(NEW.product_id, OLD.product_id);
  if pid is null then
    return null;
  end if;
  perform public.recompute_product_stock(pid);
  return null;
end;
$$;

drop trigger if exists trg_product_variants_stock_sync on public.product_variants;
create trigger trg_product_variants_stock_sync
after insert or update of stock or delete on public.product_variants
for each row execute function public.after_variant_write();
