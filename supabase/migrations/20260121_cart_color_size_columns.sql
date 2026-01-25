-- Add selected_color and selected_size columns to cart_items for robust display
-- These store the customer's selected color and size separately from variant_name

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS selected_color TEXT;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS selected_size TEXT;

COMMENT ON COLUMN cart_items.selected_color IS 'Customer selected color for display (e.g., "Rock green")';
COMMENT ON COLUMN cart_items.selected_size IS 'Customer selected size for display (e.g., "L")';
