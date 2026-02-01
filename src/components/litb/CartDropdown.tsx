"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import SmartImage from "@/components/smart-image";
import type { Route } from "next";

type MiniItem = {
  id: string | number;
  quantity: number;
  product?: { id: number; title: string; price: number; images?: string[] } | null;
  variant?: { id?: number; image_url?: string; price?: number } | null;
  variantName?: string | null;
};

export default function CartDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MiniItem[]>([]);

  useEffect(() => {
    if (!open) return;
    let aborted = false;
    (async () => {
      try {
        const r = await fetch("/api/cart", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (aborted) return;
        setItems(Array.isArray(j.items) ? j.items : []);
      } catch {}
    })();
    return () => { aborted = true };
  }, [open]);

  const preview = items.slice(0, 4);
  const more = items.length > 4;

  const renderThumb = (it: MiniItem) => {
    const url = it.variant?.image_url || (it.product?.images && it.product.images[0]) || "/placeholder.svg";
    return (
      <div className="relative h-12 w-12 rounded border bg-muted overflow-hidden shrink-0">
        <SmartImage src={url} alt={it.product?.title || "Item"} fill className="object-cover" loading="lazy" />
      </div>
    );
  };

  const priceOf = (it: MiniItem) => {
    const unit = (it.variant && typeof it.variant.price === 'number') ? it.variant.price! : (it.product?.price ?? 0);
    return unit * (it.quantity || 1);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link href={"/cart" as Route} className="relative flex items-center gap-1 text-[#e31e24] font-medium">
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden md:inline">CART</span>
      </Link>

      {open && (
        <div className="absolute right-0 top-full pt-2 z-50 hidden md:block">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-[360px] p-3">
            {preview.length === 0 ? (
              <div className="text-sm text-gray-500 px-2 py-6 text-center">Your cart is empty.</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-auto">
                {preview.map((it) => (
                  <Link
                    key={String(it.id)}
                    href={("/cart" as Route)}
                    className="flex items-center gap-3 rounded hover:bg-gray-50 p-2"
                  >
                    {renderThumb(it)}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{it.product?.title || "Item"}</div>
                      {it.variantName && (
                        <div className="text-xs text-gray-500 truncate">{it.variantName}</div>
                      )}
                      <div className="text-xs text-gray-600">Qty: {it.quantity}</div>
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap">
                      ${priceOf(it).toFixed(2)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-3">
              <Link href={"/cart" as Route} className="text-sm text-[#e31e24] hover:underline">View Cart</Link>
              {more && (
                <Link href={"/cart" as Route} className="text-sm text-gray-600 hover:text-[#e31e24]">More</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
