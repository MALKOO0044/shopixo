-- Add shipping-related columns to product_variants for per-variant shipping estimates
-- Generated on 2025-10-03 03:23 (+03:00)

alter table if exists public.product_variants
  add column if not exists weight_grams integer null;

alter table if exists public.product_variants
  add column if not exists length_cm numeric(10,2) null;

alter table if exists public.product_variants
  add column if not exists width_cm numeric(10,2) null;

alter table if exists public.product_variants
  add column if not exists height_cm numeric(10,2) null;

-- Optional: simple index to filter by product quickly is already present
-- (idx_product_variants_product). No extra index needed here.
