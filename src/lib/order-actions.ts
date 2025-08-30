"use server";

import { createClient } from "@supabase/supabase-js";
import { getCartItemsBySessionId, CartItem } from "./cart-actions";

// IMPORTANT: Create a new Supabase client with the service role key
// This is necessary because this action will be called from a webhook
// where there is no user session.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Creates an order in the database from a cart session.
 * @param cartSessionId The ID of the cart session.
 * @param userId The ID of the user placing the order.
 * @param stripeSessionId The ID of the Stripe Checkout session.
 */
export async function createOrder(cartSessionId: string, userId: string, stripeSessionId: string) {
  const { items, error: cartError } = await getCartItemsBySessionId(cartSessionId);

  if (cartError || !items || items.length === 0) {
    throw new Error(`Could not retrieve cart items or cart is empty. Error: ${cartError?.message}`);
  }

  const totalAmount = items.reduce((sum: number, item: CartItem) => {
    if (!item.product) return sum;
    return sum + item.product.price * item.quantity;
  }, 0);

  // 1. Create the order
  const { data: order, error: orderError } = await supabaseAdmin
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

  const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    // If creating order items fails, we should ideally roll back the order creation.
    // For simplicity, we'll log the error. In production, you'd want a transaction.
    throw new Error("Failed to create order items.");
  }

  // 3. Clear the cart
  const { error: deleteError } = await supabaseAdmin.from("cart_items").delete().eq("cart_session_id", cartSessionId);
  if (deleteError) {
    console.error("Failed to clear cart items after order creation:", deleteError);
    // This is not a critical failure, so we just log it.
  }

  return { orderId: order.id };
}
