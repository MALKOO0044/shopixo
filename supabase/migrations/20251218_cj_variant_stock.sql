-- Add CJ and Factory stock columns to product_variants
-- This enables accurate tracking of inventory from different sources
-- Generated on 2025-12-18
-- 
-- 100% ACCURACY MANDATE: null = unknown stock (not 0, not fabricated)

-- Add variant_key column for CJ's short variant name (e.g., "Black And Silver-2XL")
alter table if exists public.product_variants
  add column if not exists variant_key text null;

-- Add cj_stock column for CJ warehouse inventory (null = unknown, not 0)
alter table if exists public.product_variants
  add column if not exists cj_stock integer null;

-- Add factory_stock column for supplier/factory inventory (null = unknown, not 0)
alter table if exists public.product_variants
  add column if not exists factory_stock integer null;

-- Allow stock column to be nullable to support "unknown" stock (100% accuracy mandate)
-- null means CJ didn't provide stock data, 0 means truly zero stock
alter table if exists public.product_variants
  alter column stock drop not null;

-- Drop check constraint if exists to allow null values
-- (PostgreSQL constraint might be named differently, try common names)
do $$
begin
  -- Try to drop common constraint names
  execute 'alter table product_variants drop constraint if exists product_variants_stock_check';
  execute 'alter table product_variants drop constraint if exists stock_nonnegative';
exception when others then
  null; -- Ignore if constraint doesn't exist
end $$;

-- Add new constraint that allows null OR non-negative values
alter table if exists public.product_variants
  add constraint stock_nonnegative check (stock is null or stock >= 0);

-- Also make products.stock nullable for 100% accuracy
-- null means all variants have unknown stock
alter table if exists public.products
  alter column stock drop not null;

-- Update the trigger to keep product.stock in sync with sum of known stock values
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

-- Update recompute_product_stock to handle nullable stock values
-- 100% ACCURACY: If all variants have null stock, product stock is also null
create or replace function public.recompute_product_stock(product_id_in bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_known_stock bigint;
  has_any_known_stock boolean;
begin
  -- Check if ANY variant has known (non-null) stock
  select exists(
    select 1 from public.product_variants
    where product_id = product_id_in and stock is not null
  ) into has_any_known_stock;
  
  if has_any_known_stock then
    -- Sum known stock values (null variants contribute 0)
    select sum(coalesce(stock, 0))
    into total_known_stock
    from public.product_variants
    where product_id = product_id_in;
    
    update public.products
    set stock = total_known_stock
    where id = product_id_in;
  else
    -- All variants have unknown stock - product stock is also unknown (null)
    update public.products
    set stock = null
    where id = product_id_in;
  end if;
end;
$$;

-- Comment explaining the columns
comment on column public.product_variants.variant_key is 'CJ short variant name (e.g., Black And Silver-2XL)';
comment on column public.product_variants.cj_stock is 'Stock quantity in CJ warehouse (verified, ready to ship)';
comment on column public.product_variants.factory_stock is 'Stock quantity at supplier factory (may require 1-3 days processing)';
