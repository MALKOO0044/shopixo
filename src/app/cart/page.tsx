import { createCheckoutSession } from "@/lib/payment-actions";
import { getCart } from "@/lib/cart-actions";
import { formatCurrency } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import CartItem from "@/app/cart/cart-item";

export const metadata = {
  title: "Your Cart",
};

export default async function CartPage() {
  const cartItems = await getCart();

  const subtotal = cartItems.reduce((acc, item) => {
    // Type guard to ensure product is not null
    if (item.product) {
      return acc + item.quantity * item.product.price;
    }
    return acc;
  }, 0);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Your Cart</h1>
      {cartItems.length === 0 ? (
        <div className="mt-6 text-slate-600">
          Your cart is empty.{" "}
          <Link href="/shop" className="underline">
            Continue shopping
          </Link>
          .
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm h-fit">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <div className="mt-3 flex justify-between text-sm text-slate-700">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Taxes and shipping calculated at checkout.
            </p>
            <form action={createCheckoutSession}>
              <button type="submit" className="btn-primary mt-4 w-full">Proceed to Checkout</button>
            </form>
            <div className="mt-4 text-xs text-slate-500">
              Have a coupon? Apply at checkout.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

