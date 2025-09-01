import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { createOrder } from "@/lib/order-actions";
import { stripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic'; // force dynamic to prevent build errors
export const runtime = 'nodejs';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, cartSessionId } = session.metadata!;

      if (!userId || !cartSessionId) {
        console.error("Webhook Error: Missing metadata for userId or cartSessionId");
        return new NextResponse("Webhook Error: Missing metadata", { status: 400 });
      }

      try {
        await createOrder(cartSessionId, userId, session.id);
        console.log(`✅ Order created for user ${userId} from cart ${cartSessionId}`);
      } catch (err: any) {
        console.error(`❌ Error creating order: ${err.message}`);
        // We don't return a 400 here because Stripe will retry, which might lead to duplicate orders.
        // In a real-world scenario, you'd have more robust error handling and de-duplication logic.
        return new NextResponse("Internal Server Error while creating order", { status: 500 });
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new NextResponse(null, { status: 200 });
}
