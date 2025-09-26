import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { maybeCreateCjOrderForOrderId } from '@/lib/ops/cj-fulfill';

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

          const parsedCart: Array<{ productId: number | string; quantity: number; price: number }>
            = JSON.parse(metadata.cart as string);

          const totalAmount = parsedCart.reduce((acc, i) => acc + i.price * i.quantity, 0);

          // 1) Create or update order (idempotent on stripe_session_id)
          const { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .upsert(
              { user_id: userId, total_amount: totalAmount, status: "paid", stripe_session_id: session.id },
              { onConflict: "stripe_session_id" }
            )
            .select()
            .single();
          if (orderError || !order) {
            console.error("Error upserting order:", orderError);
            return new Response("Error creating order", { status: 500 });
          }

          // If order already has items, we've processed this event; exit early (idempotency)
          const { count: existingItemsCount, error: countError } = await supabaseAdmin
            .from("order_items")
            .select("id", { count: "exact", head: true })
            .eq("order_id", order.id);
          if (countError) {
            console.warn("Failed to check existing order items:", countError);
          }
          if ((existingItemsCount ?? 0) > 0) {
            break;
          }

          // 2) Create order items
          const orderItems = parsedCart.map((item) => ({
            order_id: order.id,
            product_id: typeof item.productId === 'string' ? Number(item.productId) : item.productId,
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
                product_id_in: typeof item.productId === 'string' ? Number(item.productId) : item.productId,
                quantity_in: item.quantity,
              })
            )
          );

          // 4) Trigger CJ fulfillment (best-effort, non-blocking errors). This is idempotent upstream via CJ orderNo.
          try {
            const ful = await maybeCreateCjOrderForOrderId(order.id as number);
            if (!ful.ok) {
              console.warn('CJ fulfillment not created:', ful.reason);
            }
          } catch (e: any) {
            console.warn('CJ fulfillment error:', e?.message || e);
          }

          // 5) Best-effort: clear cart items by session ID (if provided)
          const cartSessionId = (metadata.cartSessionId as string | undefined) || undefined;
          if (cartSessionId) {
            const { error: clearErr } = await supabaseAdmin
              .from("cart_items")
              .delete()
              .eq("session_id", cartSessionId);
            if (clearErr) {
              console.warn("Failed to clear cart items for session after payment:", clearErr);
            }
          }
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
