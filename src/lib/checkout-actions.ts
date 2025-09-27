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
    .filter(item => item.product !== null)
    .map((item) => {
      const product = item.product!;
      const hasVariantPrice = !!item.variant && item.variant.price !== null && item.variant.price !== undefined;
      const unit = hasVariantPrice ? (item.variant!.price as number) : product.price;
      const firstImage = product.images.length > 0 ? product.images[0] : undefined;
      const absImage = firstImage && /^https?:\/\//i.test(firstImage) ? firstImage : (firstImage ? `${getSiteUrl()}${firstImage}` : undefined);
      return {
        price_data: {
          currency: (process.env.NEXT_PUBLIC_CURRENCY || "USD").toLowerCase(),
          product_data: {
            name: product.title,
            images: absImage ? [absImage] : [],
            metadata: {
              productId: product.id,
              variantId: item.variant?.id || '',
            },
          },
          unit_amount: Math.round(unit * 100),
        },
        quantity: item.quantity,
      };
    });

  const siteUrl = getSiteUrl();
  const checkoutSession = await getStripe().checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
    customer_email: session.user.email,
    allow_promotion_codes: true,
    metadata: {
      userId: session.user.id,
      cart: JSON.stringify(
        cart.map(item => ({
          productId: item.product!.id,
          variantId: item.variant?.id || null,
          quantity: item.quantity,
          price: (item.variant && item.variant.price !== null && item.variant.price !== undefined) ? (item.variant.price as number) : item.product!.price,
        }))
      ),
      cartSessionId: cookies().get("cart_id")?.value || "",
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Could not create checkout session.");
  }

  redirect(checkoutSession.url);
}
