-- Migration: Add CJ product data columns to products table
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Add columns for storing all variant colors and sizes
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_colors JSONB DEFAULT '[]'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_sizes JSONB DEFAULT '[]'::JSONB;

-- Add columns for price range (when product has multiple variants)
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_price NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_price NUMERIC(10,2);

-- Add columns for real CJ rating and review data
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add column to indicate if product has variants
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Add columns for product specifications and selling points
ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_points JSONB DEFAULT '[]'::JSONB;

-- Add CJ-specific columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_product_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cj_category_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_sku TEXT;

-- Add shipping and delivery columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS processing_time_hours INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_time_hours INTEGER;

-- Add physical dimension columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_g NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_length NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_width NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS pack_height NUMERIC;

-- Add material and origin columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_country TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_country_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hs_code TEXT;

-- Add size chart and variant data columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_chart_images JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add is_active column for product visibility
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster CJ product lookups
CREATE INDEX IF NOT EXISTS idx_products_cj_product_id ON products(cj_product_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Verify the columns were added (optional check)
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'products' 
-- ORDER BY ordinal_position;
