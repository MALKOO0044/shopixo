import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, currency?: string, locale?: string) {
  const curr = (currency || process.env.NEXT_PUBLIC_CURRENCY || "USD");
  const loc = locale || (typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.language : 'ar-SA');
  return new Intl.NumberFormat(loc, { style: "currency", currency: curr }).format(value);
}
