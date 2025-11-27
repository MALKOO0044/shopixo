"use server";

import { createClient } from "@supabase/supabase-js";
import { getCartItemsBySessionId } from "./cart-actions";
import type { CartItem } from "./types";

// IMPORTANT: Use a lazily initialized Supabase admin client to avoid
// build-time env access. This is called in server actions/webhooks only.
let supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

/**
 * Creates an order in the database from a cart session.
 * @param cartSessionId The ID of the cart session.
 * @param userId The ID of the user placing the order.
 * @param stripeSessionId The ID of the Stripe Checkout session.
 */
export async function createOrder(cartSessionId: string, userId: string, stripeSessionId: string) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Server misconfiguration: Supabase env vars missing");
  }
  const client = admin as any;
  const { items, error: cartError } = await getCartItemsBySessionId(cartSessionId);

  if (cartError || !items || items.length === 0) {
    throw new Error(`Could not retrieve cart items or cart is empty. Error: ${cartError?.message}`);
  }

  const totalAmount = items.reduce((sum: number, item: CartItem) => {
    if (!item.product) return sum;
    return sum + item.product.price * item.quantity;
  }, 0);

  // 1. Create the order
  const { data: order, error: orderError } = await client
    .from("orders")
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      stripe_session_id: stripeSessionId,
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    throw new Error("Failed to create order.");
  }

  // 2. Create the order items
  const orderItems = items
    .filter((item: CartItem) => item.product)
    .map((item: CartItem) => ({
      order_id: order.id,
      product_id: item.product!.id,
      quantity: item.quantity,
      price: item.product!.price, // Price at the time of purchase
    }));

  if (orderItems.length === 0) {
    throw new Error("No valid items to add to the order.");
  }

  const { error: itemsError } = await client.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // If creating order items fails, we should ideally roll back the order creation.
    // For simplicity, we'll log the error. In production, you'd want a transaction.
    throw new Error("Failed to create order items.");
  }

  // 3. Clear the cart
  const { error: deleteError } = await client
    .from("cart_items")
    .delete()
    .eq("session_id", cartSessionId);
  if (deleteError) {
    console.error("Failed to clear cart items after order creation:", deleteError);
    // This is not a critical failure, so we just log it.
  }

  return { orderId: order.id };
}
