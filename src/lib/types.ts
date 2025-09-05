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
  variants: { name: string; options: string[] }[];
  is_active?: boolean; // soft delete flag (optional to avoid breaking existing code)
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
};

export type CartItem = {
  id: number;
  quantity: number;
  product: Product | null;
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
