export type ProductVariant = {
  id: number;
  product_id: number;
  option_name: string; // e.g., "Size"
  option_value: string; // e.g., S | M | L | XL | XXL | XXXL
  cj_sku: string | null;
  cj_variant_id?: string | null;
  price: number | null; // if null, fallback to product.price
  stock: number;
  // Optional shipping metadata (if available from CJ)
  weight_grams?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
};

export type Product = {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  rating: number;
  stock: number;
  // UI-oriented variants selector (kept for backward compatibility)
  variants: { name: string; options: string[] }[];
  is_active?: boolean; // soft delete flag (optional to avoid breaking existing code)

  // Product codes
  product_code?: string | null; // Shopixo public code (XO00001 format) - visible to customers
  supplier_sku?: string | null; // Supplier SKU from CJ - admin only

  // Shipping and CJ linkage metadata (optional)
  video_url?: string | null;
  processing_time_hours?: number | null;
  delivery_time_hours?: number | null;
  origin_area?: string | null;
  origin_country_code?: string | null;
  free_shipping?: boolean;
  inventory_shipping_fee?: number | null;
  last_mile_fee?: number | null;
  cj_product_id?: string | null;
  shipping_from?: string | null;
};

export type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  product: Product;
};

export type Order = {
  id: number;
  created_at: string;
  total_amount: number;
  status: string;
  user_id: string;
  order_items: OrderItem[];
  // This will be populated after joining with the users table
  user_email?: string;
  // Stripe metadata
  stripe_session_id?: string | null;
  // CJ fulfillment and tracking
  cj_order_no?: string | null;
  shipping_status?: string | null;
  tracking_number?: string | null;
  carrier?: string | null;
};

export type CartItem = {
  id: number;
  quantity: number;
  product: Product | null;
  variant?: ProductVariant | null;
};

export type Address = {
  id: number;
  user_id: string;
  full_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  created_at?: string;
};

export type Review = {
  id: number;
  user_id: string;
  product_id: number;
  rating: number; // 1..5
  title: string | null;
  body: string | null;
  created_at?: string;
};
