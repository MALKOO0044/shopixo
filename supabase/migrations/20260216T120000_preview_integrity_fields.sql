-- Align queue and product schema with preview fields (no regeneration)

-- Product queue additional fields (verbatim preview data)
alter table public.product_queue
  add column if not exists store_sku text,
  add column if not exists overview text,
  add column if not exists product_info text,
  add column if not exists size_info text,
  add column if not exists product_note text,
  add column if not exists packing_list text,
  add column if not exists product_type text,
  add column if not exists available_models jsonb,
  add column if not exists inventory_status text,
  add column if not exists inventory_error_message text;

-- Products table additional fields (verbatim preview data)
alter table public.products
  add column if not exists store_sku text,
  add column if not exists overview text,
  add column if not exists product_info text,
  add column if not exists size_info text,
  add column if not exists product_note text,
  add column if not exists packing_list text,
  add column if not exists product_type text,
  add column if not exists available_models jsonb,
  add column if not exists inventory_status text,
  add column if not exists inventory_error_message text;

-- Product variants: store sku + shipping cost
alter table public.product_variants
  add column if not exists store_sku text,
  add column if not exists shipping_usd numeric(12,2);
