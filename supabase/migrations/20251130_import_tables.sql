-- Import System Tables for Shopixo Product Discovery
-- Run this in your Supabase SQL Editor to enable the product import system

-- Create import_batches table
CREATE TABLE IF NOT EXISTS import_batches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  keywords VARCHAR(255),
  category VARCHAR(255),
  filters JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  products_found INTEGER DEFAULT 0,
  products_approved INTEGER DEFAULT 0,
  products_imported INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create product_queue table
CREATE TABLE IF NOT EXISTS product_queue (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES import_batches(id) ON DELETE SET NULL,
  cj_product_id VARCHAR(255) NOT NULL UNIQUE,
  cj_sku VARCHAR(255),
  name_en VARCHAR(500),
  name_ar VARCHAR(500),
  description_en TEXT,
  description_ar TEXT,
  category VARCHAR(255),
  images JSONB DEFAULT '[]',
  video_url TEXT,
  variants JSONB DEFAULT '[]',
  cj_price_usd DECIMAL(10,2),
  shipping_cost_usd DECIMAL(10,2),
  calculated_retail_sar DECIMAL(10,2),
  margin_applied DECIMAL(5,2),
  supplier_rating DECIMAL(3,2) DEFAULT 4.0,
  total_sales INTEGER DEFAULT 0,
  stock_total INTEGER DEFAULT 0,
  processing_days INTEGER DEFAULT 3,
  delivery_days_min INTEGER DEFAULT 7,
  delivery_days_max INTEGER DEFAULT 15,
  quality_score DECIMAL(3,2) DEFAULT 0.75,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  shopixo_product_id VARCHAR(255),
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create import_logs table
CREATE TABLE IF NOT EXISTS import_logs (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES import_batches(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_queue_status ON product_queue(status);
CREATE INDEX IF NOT EXISTS idx_product_queue_batch_id ON product_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_product_queue_category ON product_queue(category);
CREATE INDEX IF NOT EXISTS idx_product_queue_quality_score ON product_queue(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_queue_created_at ON product_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_batch_id ON import_logs(batch_id);

-- Add RLS policies for service role access
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to import_batches" ON import_batches
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to product_queue" ON product_queue
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to import_logs" ON import_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Grant usage to authenticated users (for admin panel)
GRANT ALL ON import_batches TO authenticated;
GRANT ALL ON product_queue TO authenticated;
GRANT ALL ON import_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE import_batches_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE product_queue_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE import_logs_id_seq TO authenticated;

-- Comment for documentation
COMMENT ON TABLE import_batches IS 'Stores product import batch metadata for the product discovery system';
COMMENT ON TABLE product_queue IS 'Stores products pending approval for import into the main catalog';
COMMENT ON TABLE import_logs IS 'Audit log for import operations and status changes';
