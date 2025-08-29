export type Product = {
  slug: string;
  title: string;
  price: number;
  rating: number; // 0-5
  images: string[];
  description: string;
  category: string;
  variants?: { name: string; options: string[] }[];
};

export const products: Product[] = [
  {
    slug: "aero-jacket",
    title: "Aero Jacket",
    price: 89.99,
    rating: 4.7,
    images: ["/images/product-1.svg"],
    description: "Lightweight, water-resistant jacket perfect for everyday use.",
    category: "Apparel",
    variants: [
      { name: "Size", options: ["S", "M", "L", "XL"] },
      { name: "Color", options: ["Black", "Olive", "Navy"] },
    ],
  },
  {
    slug: "neo-sneakers",
    title: "Neo Sneakers",
    price: 119.0,
    rating: 4.6,
    images: ["/images/product-2.svg"],
    description: "Comfortable sneakers with breathable mesh and cushioned sole.",
    category: "Footwear",
    variants: [
      { name: "Size", options: ["7", "8", "9", "10", "11"] },
      { name: "Color", options: ["White", "Gray", "Blue"] },
    ],
  },
  {
    slug: "pulse-earbuds",
    title: "Pulse Earbuds",
    price: 59.5,
    rating: 4.4,
    images: ["/images/product-3.svg"],
    description: "Wireless earbuds with noise isolation and 24-hour battery life.",
    category: "Electronics",
    variants: [{ name: "Color", options: ["Black", "Mint", "Pink"] }],
  },
  {
    slug: "zen-mug",
    title: "Zen Mug",
    price: 18.0,
    rating: 4.8,
    images: ["/images/product-1.svg"],
    description: "Ceramic mug with matte finish for your perfect morning routine.",
    category: "Home",
  },
  {
    slug: "orbit-watch",
    title: "Orbit Watch",
    price: 199.99,
    rating: 4.5,
    images: ["/images/product-2.svg"],
    description: "Minimalist analog watch with stainless steel case and leather strap.",
    category: "Accessories",
  },
  {
    slug: "lumen-lamp",
    title: "Lumen Desk Lamp",
    price: 42.0,
    rating: 4.3,
    images: ["/images/product-3.svg"],
    description: "Adjustable LED lamp with warm and cool brightness modes.",
    category: "Home",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
