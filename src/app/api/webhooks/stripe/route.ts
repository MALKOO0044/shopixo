import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, cart } = session.metadata!;
    const parsedCart = JSON.parse(cart);

    const totalAmount = parsedCart.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

    // 1. Create the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        status: "paid",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return new Response(`Webhook Error: Could not create order`, { status: 500 });
    }

    // 2. Create the order items
    const orderItems = parsedCart.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Here you might want to handle the case where the order was created but items were not
      return new Response(`Webhook Error: Could not create order items`, { status: 500 });
    }

    // 3. Decrement stock for each product
    const decrementPromises = parsedCart.map((item: any) =>
      supabaseAdmin.rpc('decrement_stock', {
        product_id_in: item.productId,
        quantity_in: item.quantity,
      })
    );

    const decrementResults = await Promise.all(decrementPromises);

    for (const result of decrementResults) {
      if (result.error) {
        console.error("Error decrementing stock:", result.error);
        // This is a critical error. The order was created, but stock was not decremented.
        // This requires manual intervention or a more robust compensation logic (e.g., cancel the order).
        return new Response(`Webhook Error: Could not decrement stock`, { status: 500 });
      }
    }
  }

  return new Response(null, { status: 200 });
}
