-- Add supplier_sku (internal admin only) and product_code (public store code) to products table

-- supplier_sku: The SKU from the supplier (CJ Dropshipping) - admin only visibility
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_sku TEXT;

-- product_code: Shopixo's public product code (XO00001 format) - visible to customers
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT UNIQUE;

-- Create a sequence for generating product codes
CREATE SEQUENCE IF NOT EXISTS product_code_seq START 1;

-- Create a function to generate the next product code
CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  code TEXT;
BEGIN
  next_val := nextval('product_code_seq');
  code := 'XO' || LPAD(next_val::TEXT, 5, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Set default for new products to auto-generate product_code
ALTER TABLE products ALTER COLUMN product_code SET DEFAULT generate_product_code();

-- Generate product codes for existing products that don't have one
UPDATE products 
SET product_code = generate_product_code()
WHERE product_code IS NULL;

-- Add index for faster lookups by product_code
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

-- Add index for supplier_sku (admin searches)
CREATE INDEX IF NOT EXISTS idx_products_supplier_sku ON products(supplier_sku);

-- Comment the columns for documentation
COMMENT ON COLUMN products.supplier_sku IS 'Supplier SKU from CJ Dropshipping - admin only visibility';
COMMENT ON COLUMN products.product_code IS 'Shopixo public product code (XO00001 format) - visible to customers';
