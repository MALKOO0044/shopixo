-- Migration: Add product_variants, size_charts, and size_chart_rows tables
-- Run this in Supabase SQL Editor, then reload schema in Settings → API

-- 1. Product Variants table - stores each color/size combination with its own price and stock
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    cj_variant_id TEXT,
    sku TEXT,
    color TEXT,
    color_image TEXT,
    size TEXT,
    price NUMERIC(10,2) NOT NULL,
    compare_at_price NUMERIC(10,2),
    cost_price NUMERIC(10,2),
    shipping_cost NUMERIC(10,2),
    stock INTEGER NOT NULL DEFAULT 0,
    cj_stock INTEGER DEFAULT 0,
    factory_stock INTEGER DEFAULT 0,
    warehouse_code TEXT DEFAULT 'CN',
    weight_grams NUMERIC,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_cj_variant_id ON product_variants(cj_variant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_unique ON product_variants(product_id, color, size) WHERE color IS NOT NULL AND size IS NOT NULL;

-- 2. Size Charts table - stores the size chart metadata for a product
CREATE TABLE IF NOT EXISTS size_charts (
    id SERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    fit_type TEXT DEFAULT 'Regular Fit',
    unit TEXT DEFAULT 'cm',
    notes TEXT,
    how_to_measure JSONB,
    size_chart_images TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_size_charts_product ON size_charts(product_id);

-- 3. Size Chart Rows table - stores individual measurement rows
CREATE TABLE IF NOT EXISTS size_chart_rows (
    id SERIAL PRIMARY KEY,
    size_chart_id INTEGER NOT NULL REFERENCES size_charts(id) ON DELETE CASCADE,
    size_label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    measurements JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_size_chart_rows_chart ON size_chart_rows(size_chart_id);

-- 4. Add new columns to products table for extended data
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_colors JSONB DEFAULT '[]'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_sizes JSONB DEFAULT '[]'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_points JSONB DEFAULT '[]'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_country TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hs_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_length NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_width NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_height NUMERIC;

-- 5. Extend product_queue table with more variant/pricing data
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS variant_pricing JSONB DEFAULT '[]'::JSONB;
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS size_chart_data JSONB;
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::JSONB;
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS selling_points JSONB DEFAULT '[]'::JSONB;
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS inventory_by_warehouse JSONB;
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS price_breakdown JSONB;
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS cj_total_cost NUMERIC(10,2);
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS cj_shipping_cost NUMERIC(10,2);
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS cj_product_cost NUMERIC(10,2);
ALTER TABLE product_queue ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2);

-- 6. Enable RLS on new tables
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_chart_rows ENABLE ROW LEVEL SECURITY;

-- Public read policies
DROP POLICY IF EXISTS "Public can read product_variants" ON product_variants;
CREATE POLICY "Public can read product_variants" ON product_variants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read size_charts" ON size_charts;
CREATE POLICY "Public can read size_charts" ON size_charts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read size_chart_rows" ON size_chart_rows;
CREATE POLICY "Public can read size_chart_rows" ON size_chart_rows
    FOR SELECT USING (true);

-- Service role management policies
DROP POLICY IF EXISTS "Service role manages product_variants" ON product_variants;
CREATE POLICY "Service role manages product_variants" ON product_variants
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages size_charts" ON size_charts;
CREATE POLICY "Service role manages size_charts" ON size_charts
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages size_chart_rows" ON size_chart_rows;
CREATE POLICY "Service role manages size_chart_rows" ON size_chart_rows
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Done! After running this, go to Settings → API → Click "Reload schema"
