"use client";

import { useFormState, useFormStatus } from "react-dom";
import { removeItem, updateItemQuantity } from "@/lib/cart-actions";
import { formatCurrency } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

function SubmitButton({ children, className }: { children: React.ReactNode, className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {children}
    </button>
  );
}

export default function CartItem({ item }: { item: CartItemType }) {
  const [removeMessage, removeAction] = useFormState(removeItem, null);
  const [updateMessage, updateAction] = useFormState(updateItemQuantity, null);
  const { product, variant } = item;

  if (!product) {
    return null; // Or some fallback UI
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
      <div className="relative h-20 w-20 overflow-hidden rounded-md bg-slate-100">
        <Image src={product.images?.[0] || "/placeholder.svg"} alt={product.title} fill className="object-cover" />
      </div>
      <div className="flex-1">
        <Link href={`/product/${product.slug}`} className="font-medium hover:underline">
          {product.title}
        </Link>
        <div className="text-sm text-slate-600">
          {variant ? (
            <>
              <span className="mr-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">المقاس: {variant.option_value}</span>
              {formatCurrency((variant.price ?? product.price))} للقطعة الواحدة
            </>
          ) : (
            <>{formatCurrency(product.price)} للقطعة الواحدة</>
          )}
        </div>
        <div className="mt-2 flex items-center">
          <form action={updateAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity - 1} />
            <SubmitButton className="rounded-l-md border px-3 py-1">-</SubmitButton>
          </form>
          <span className="border-y px-4 py-1">{item.quantity}</span>
          <form action={updateAction}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={item.quantity + 1} />
            <SubmitButton className="rounded-r-md border px-3 py-1">+</SubmitButton>
          </form>
        </div>
      </div>
      <form action={removeAction}>
        <input type="hidden" name="itemId" value={item.id} />
        <SubmitButton className="text-sm text-red-600 underline">إزالة</SubmitButton>
      </form>
    </div>
  );
}
