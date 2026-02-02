-- Product Rating Engine migration
-- Adds displayed_rating and rating_confidence to products
-- Creates product_rating_signals table for snapshots
-- Optionally adds columns to product_queue for admin UI consistency

BEGIN;

-- Add new columns to products
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS displayed_rating NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS rating_confidence NUMERIC(3,2);

-- Create signals snapshot table
CREATE TABLE IF NOT EXISTS product_rating_signals (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  cj_product_id TEXT,
  context TEXT NOT NULL, -- e.g. 'discover','preview','queue','import','admin-recompute','details'
  signals JSONB NOT NULL,
  displayed_rating NUMERIC(3,1) NOT NULL,
  rating_confidence NUMERIC(3,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_product_rating_signals_product_id ON product_rating_signals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_rating_signals_created_at ON product_rating_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_rating_signals_cjpid ON product_rating_signals(cj_product_id);

-- Add optional columns to product_queue to surface pre-import rating
ALTER TABLE IF EXISTS product_queue
  ADD COLUMN IF NOT EXISTS displayed_rating NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS rating_confidence NUMERIC(3,2);

-- Enable RLS and allow service role full access
ALTER TABLE product_rating_signals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "service_role_full_access_product_rating_signals"
  ON product_rating_signals FOR ALL
  USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
