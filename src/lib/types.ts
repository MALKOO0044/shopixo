export type Product = {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  rating: number;
  variants: { name: string; options: string[] }[];
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
