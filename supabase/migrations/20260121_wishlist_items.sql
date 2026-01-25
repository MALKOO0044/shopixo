-- Migration: Create wishlist_items table for favorites functionality
-- Run this migration on production database before deploying cart redesign

CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  session_id UUID,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for logged-in users: one entry per product/variant per user
  CONSTRAINT wishlist_user_unique UNIQUE(user_id, product_id, variant_name),
  
  -- Unique constraint for anonymous users: one entry per product/variant per session
  CONSTRAINT wishlist_session_unique UNIQUE(session_id, product_id, variant_name)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);

-- Index for fast lookups by session
CREATE INDEX IF NOT EXISTS idx_wishlist_session_id ON wishlist_items(session_id);

-- Index for product lookups (covered by FK but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON wishlist_items(product_id);

COMMENT ON TABLE wishlist_items IS 'Stores user favorites/wishlist items for the Move to Favorites cart feature';
COMMENT ON COLUMN wishlist_items.variant_name IS 'Normalized variant name (trimmed, from cart_items.variant_name)';
