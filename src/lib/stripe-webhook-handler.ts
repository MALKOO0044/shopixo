import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export async function handleStripeWebhook(req: Request): Promise<Response> {
  const textBody = await req.text();
  const signature =
    (req.headers.get("stripe-signature") as string | null) ||
    (req.headers.get("Stripe-Signature") as string | null);

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env var");
    return new Response("Server misconfiguration", { status: 500 });
  }
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase env vars");
    return new Response("Server misconfiguration", { status: 500 });
  }

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(textBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  console.log("stripe_webhook_event", { id: event.id, type: event.type });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        // We support two formats for backward compatibility:
        // 1) metadata.cart (JSON string of items)
        // 2) metadata.cartSessionId (legacy, not used anymore)
        if (metadata.cart) {
          const userId = metadata.userId as string | undefined;
          if (!userId) {
            console.error("Missing userId in session metadata");
            break;
          }

          const parsedCart: Array<{ productId: string; quantity: number; price: number }>
            = JSON.parse(metadata.cart as string);

          const totalAmount = parsedCart.reduce((acc, i) => acc + i.price * i.quantity, 0);

          // 1) Create order
          const { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .insert({ user_id: userId, total_amount: totalAmount, status: "paid" })
            .select()
            .single();
          if (orderError || !order) {
            console.error("Error creating order:", orderError);
            return new Response("Error creating order", { status: 500 });
          }

          // 2) Create order items
          const orderItems = parsedCart.map((item) => ({
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
            return new Response("Error creating order items", { status: 500 });
          }

          // 3) Decrement stock (best-effort)
          await Promise.all(
            parsedCart.map((item) =>
              supabaseAdmin.rpc("decrement_stock", {
                product_id_in: item.productId,
                quantity_in: item.quantity,
              })
            )
          );
        } else if (metadata.cartSessionId) {
          // Legacy path: metadata had cartSessionId/userId; keep 200 so Stripe doesn't retry.
          console.warn("Received legacy webhook format without cart JSON; ignoring.");
        }
        break;
      }
      default: {
        // No-op
        break;
      }
    }
  } catch (e: any) {
    console.error("Unhandled webhook error:", e);
    return new Response("Internal Server Error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
