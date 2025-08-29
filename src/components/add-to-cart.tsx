"use client";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export default function AddToCart({ id, title, price, image }: { id: string; title: string; price: number; image?: string }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  return (
    <div className="mt-6 flex items-center gap-3">
      <div className="flex items-center rounded-md border">
        <button className="px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">-</button>
        <input className="w-12 border-x px-3 py-2 text-center" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        <button className="px-3 py-2" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
      </div>
      <button className="btn-primary" onClick={() => addItem({ id, title, price, image }, qty)}>Add to cart</button>
    </div>
  );
}
