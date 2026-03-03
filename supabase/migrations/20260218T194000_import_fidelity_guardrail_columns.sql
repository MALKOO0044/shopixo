-- Ensure queue/product fidelity guardrail columns exist in all environments.
-- Idempotent by design.

alter table public.product_queue
  add column if not exists store_sku text,
  add column if not exists description_en text,
  add column if not exists overview text,
  add column if not exists product_info text,
  add column if not exists size_info text,
  add column if not exists product_note text,
  add column if not exists packing_list text,
  add column if not exists available_colors jsonb,
  add column if not exists available_sizes jsonb,
  add column if not exists variant_pricing jsonb,
  add column if not exists variants jsonb,
  add column if not exists calculated_retail_sar numeric(10,2),
  add column if not exists color_image_map jsonb;

alter table public.products
  add column if not exists description text,
  add column if not exists store_sku text,
  add column if not exists overview text,
  add column if not exists product_info text,
  add column if not exists size_info text,
  add column if not exists product_note text,
  add column if not exists packing_list text,
  add column if not exists available_colors jsonb,
  add column if not exists available_sizes jsonb,
  add column if not exists color_image_map jsonb;
