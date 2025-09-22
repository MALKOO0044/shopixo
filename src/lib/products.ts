import type { Product } from "@/lib/types";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

// Temporary in-memory catalog used by the shop page and OpenGraph image generator.
// In production, products are fetched from Supabase. Keeping this here ensures build succeeds.
export const products: Product[] = SAMPLE_PRODUCTS;

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

