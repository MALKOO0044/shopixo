"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { getCart } from "@/lib/cart-actions";
import { getSiteUrl } from "@/lib/site";

export async function createCheckoutSession() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const cart = await getCart();

  if (!cart || cart.length === 0) {
    throw new Error("Cart is empty.");
  }

  const lineItems = cart
    .filter(item => item.product !== null) // Filter out null products
    .map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product!.title, // Use title instead of name
          images: item.product!.images.length > 0 ? [item.product!.images[0]] : [], // Use first image from images array
          metadata: {
            productId: item.product!.id,
          },
        },
        unit_amount: item.product!.price * 100, // Price in cents
      },
      quantity: item.quantity,
    }));

  const siteUrl = getSiteUrl();
  const checkoutSession = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
    customer_email: session.user.email,
    metadata: {
      userId: session.user.id,
      cart: JSON.stringify(cart.map(item => ({ productId: item.product!.id, quantity: item.quantity, price: item.product!.price }))),
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Could not create checkout session.");
  }

  redirect(checkoutSession.url);
}
