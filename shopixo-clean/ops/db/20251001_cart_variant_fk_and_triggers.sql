-- Ensure cart/order items can reference product_variants and keep product stock in sync
-- Idempotent: uses IF NOT EXISTS and constraint existence checks

-- 1) cart_items.variant_id FK to product_variants
alter table if exists public.cart_items
  add column if not exists variant_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_variant_id_fkey'
  ) then
    alter table public.cart_items
      add constraint cart_items_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id)
      on delete set null;
  end if;
end $$;

create index if not exists cart_items_variant_id_idx on public.cart_items(variant_id);

-- 2) order_items.variant_id FK to product_variants (optional but recommended)
alter table if exists public.order_items
  add column if not exists variant_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_variant_id_fkey'
  ) then
    alter table public.order_items
      add constraint order_items_variant_id_fkey
      foreign key (variant_id) references public.product_variants(id)
      on delete set null;
  end if;
end $$;

create index if not exists order_items_variant_id_idx on public.order_items(variant_id);

-- 3) Partial unique index to prevent duplicate CJ imports
create unique index if not exists products_cj_pid_uniq
  on public.products(cj_product_id)
  where cj_product_id is not null;

-- 4) Triggers to recompute product stock after variants change
create or replace function public.tg_recompute_product_stock()
returns trigger language plpgsql as $$
begin
  perform public.recompute_product_stock(coalesce(new.product_id, old.product_id));
  return null;
end $$;

drop trigger if exists product_variants_aiud_recompute on public.product_variants;
create trigger product_variants_aiud_recompute
after insert or update or delete on public.product_variants
for each row execute function public.tg_recompute_product_stock();
