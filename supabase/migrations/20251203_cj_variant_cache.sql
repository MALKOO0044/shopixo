-- CJ Variant Cache Table
-- Stores variant data (vid, sku, price, weight) for products added to "My Products"
-- Required because CJ /product/variant/query only works for products in "My Products"
-- Part of the two-phase approach: add to My Products -> query variants -> cache in DB

CREATE TABLE IF NOT EXISTS cj_variant_cache (
  id SERIAL PRIMARY KEY,
  cj_product_id VARCHAR(255) NOT NULL,
  cj_variant_id VARCHAR(255) NOT NULL UNIQUE,
  variant_sku VARCHAR(255),
  variant_name TEXT,
  variant_sell_price DECIMAL(12, 2),
  weight_grams DECIMAL(10, 2),
  added_to_my_products BOOLEAN DEFAULT false,
  last_shipping_price_sar DECIMAL(12, 2),
  last_shipping_fetch_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variant_cache_product ON cj_variant_cache(cj_product_id);
CREATE INDEX IF NOT EXISTS idx_variant_cache_sku ON cj_variant_cache(variant_sku);
