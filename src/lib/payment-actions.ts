"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

import { getCart } from "./cart-actions";
import { getStripe } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/site";

export async function createCheckoutSession() {
  const cartId = cookies().get("cart_id")?.value;
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!cartId) {
    return { error: "Cart not found." };
  }

  if (!user) {
    // Redirect to login or show an error if user is not authenticated
    return redirect("/login?redirect=/cart");
  }

  const cart = await getCart();

  if (!cart || cart.length === 0) {
    return { error: "Your cart is empty." };
  }

  // Filter out any items where the product might be null
  const validCartItems = cart.filter(item => item.product);
  if (validCartItems.length === 0) {
    return { error: "No valid items in your cart." };
  }

  try {
    const siteUrl = getSiteUrl();
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email, // User is guaranteed to exist here
      line_items: validCartItems.map((item) => ({
        price_data: {
          currency: (process.env.NEXT_PUBLIC_CURRENCY || "USD").toLowerCase(),
          product_data: {
            name: item.product!.title,
            images: item.product!.images?.length ? [item.product!.images[0]] : [],
          },
          unit_amount: item.product!.price * 100, // Price in cents
        },
        quantity: item.quantity,
      })),
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
      metadata: {
        cartSessionId: cartId, // Use the cartId from cookies
        userId: user.id,
      },
    });

    if (session.url) {
      redirect(session.url);
    } else {
      throw new Error("Could not create a checkout session.");
    }
  } catch (e) {
    console.error(e);
    return { error: "An unexpected error occurred." };
  }
}
