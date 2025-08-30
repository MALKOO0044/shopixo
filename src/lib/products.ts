export type Product = {
  id: number;
  slug: string;
  title: string;
  price: number;
  rating: number; // 0-5
  images: string[];
  description: string;
  category: string;
  variants?: { name: string; options: string[] }[];
};

