-- Real review metrics parity for Discover -> Queue -> Storefront
-- Adds imported supplier rating and reviewed-count columns used by PDP aggregation.

ALTER TABLE IF EXISTS product_queue
  ADD COLUMN IF NOT EXISTS supplier_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS supplier_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

UPDATE product_queue
SET review_count = 0
WHERE review_count IS NULL OR review_count < 0;

UPDATE products
SET review_count = 0
WHERE review_count IS NULL OR review_count < 0;

ALTER TABLE IF EXISTS product_queue
  ALTER COLUMN review_count SET DEFAULT 0;

ALTER TABLE IF EXISTS products
  ALTER COLUMN review_count SET DEFAULT 0;

DO $$
BEGIN
  IF to_regclass('public.product_queue') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_queue_review_count_non_negative'
  ) THEN
    ALTER TABLE product_queue
      ADD CONSTRAINT product_queue_review_count_non_negative CHECK (review_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_review_count_non_negative'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_review_count_non_negative CHECK (review_count >= 0);
  END IF;
END $$;
