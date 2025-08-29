"use client";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Your Cart</h1>
      {items.length === 0 ? (
        <div className="mt-6 text-slate-600">Your cart is empty. <Link href="/shop" className="underline">Continue shopping</Link>.</div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
                {item.image ? (
                  <div className="relative h-20 w-20 overflow-hidden rounded-md bg-slate-100">
                    <Image src={item.image} alt={item.title} fill className="object-cover" />
                  </div>
                ) : null}
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-slate-600">{formatCurrency(item.price)} each</div>
                  <div className="mt-2 inline-flex items-center rounded-md border">
                    <button className="px-3 py-1" onClick={() => updateQty(item.id, item.quantity - 1)}>-</button>
                    <span className="w-10 text-center">{item.quantity}</span>
                    <button className="px-3 py-1" onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <button className="text-sm text-red-600 underline" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Order Summary</h2>
            <div className="mt-3 flex justify-between text-sm text-slate-700">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Taxes and shipping calculated at checkout.</p>
            <Link href="/checkout" className="btn-primary mt-4 block text-center">Checkout</Link>
            <div className="mt-4 text-xs text-slate-500">Have a coupon? Apply at checkout.</div>
          </div>
        </div>
      )}
    </div>
  );
}
