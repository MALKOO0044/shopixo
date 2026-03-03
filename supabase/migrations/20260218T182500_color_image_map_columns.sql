-- Ensure color-image mapping persists from queue to storefront products.
-- Idempotent to support environments with partial schema drift.

alter table public.product_queue
  add column if not exists color_image_map jsonb;

alter table public.products
  add column if not exists color_image_map jsonb;
