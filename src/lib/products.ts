// Product utility functions
// Note: Product fetching is primarily done via Supabase queries in components/pages.
// This file provides shared product utilities if needed.

import type { Product } from './types';

/**
 * Format product price for display
 */
export function formatProductPrice(price: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(price);
}

/**
 * Check if a product is in stock
 */
export function isInStock(product: Product): boolean {
  return product.stock > 0;
}

/**
 * Get the primary image URL for a product
 */
export function getPrimaryImage(product: Product): string | null {
  return product.images?.length > 0 ? product.images[0] : null;
}

