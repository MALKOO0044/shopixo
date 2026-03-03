-- Soft delete for products via is_active flag
alter table if exists public.products
  add column if not exists is_active boolean not null default true;

-- Helpful composite index to speed up lists
create index if not exists idx_products_active_created
  on public.products (is_active, created_at desc);
