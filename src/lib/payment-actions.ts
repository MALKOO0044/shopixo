"use server";

// Deprecated: use '@/lib/checkout-actions' instead. This module re-exports the canonical action
// to avoid duplicate implementations that can drift over time.
export { createCheckoutSession } from "./checkout-actions";
