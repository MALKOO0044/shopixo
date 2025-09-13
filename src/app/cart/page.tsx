import { getCart } from "@/lib/cart-actions";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import CartItem from "@/app/cart/cart-item";
import CheckoutButton from "./checkout-button";

export const metadata = {
  title: "سلة التسوق",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      <h1 className="text-3xl font-bold">سلة التسوق</h1>
      {cartItems.length === 0 ? (
        <div className="mt-6 text-slate-600">
          سلة التسوق فارغة.
          <Link href="/shop" className="underline">
            متابعة التسوق
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
            <h2 className="text-lg font-semibold">ملخص الطلب</h2>
            <div className="mt-3 flex justify-between text-sm text-slate-700">
              <span>الإجمالي الفرعي</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">سيتم احتساب الضرائب والشحن عند الدفع.</p>
            <div className="mt-4">
              <CheckoutButton />
            </div>
            <div className="mt-4 text-xs text-slate-500">هل لديك كوبون؟ يمكنك تطبيقه عند الدفع.</div>
          </div>
        </div>
      )}
    </div>
  );
}

