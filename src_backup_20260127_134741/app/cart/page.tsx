import { getCart } from "@/lib/cart-actions";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import CartItem from "@/app/cart/cart-item";
import CheckoutButton from "./checkout-button";

export const metadata = {
  title: "Shopping Cart",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CartPage() {
  const cartItems = await getCart();

  const subtotal = cartItems.reduce((acc, item) => {
    if (item.product) {
      const unit = (item.variant && item.variant.price !== null && item.variant.price !== undefined)
        ? item.variant.price!
        : item.product.price;
      return acc + item.quantity * unit;
    }
    return acc;
  }, 0);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Shopping Cart</h1>
      {cartItems.length === 0 ? (
        <div className="mt-6 text-slate-600">
          Your cart is empty.{" "}
          <Link href="/shop" className="underline">
            Continue Shopping
          </Link>
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
            <p className="mt-2 text-xs text-slate-500">Free shipping on all products. Taxes calculated at checkout.</p>
            <div className="mt-4">
              <CheckoutButton />
            </div>
            <div className="mt-4 text-xs text-slate-500">Have a coupon? You can apply it at checkout.</div>
          </div>
        </div>
      )}
    </div>
  );
}
