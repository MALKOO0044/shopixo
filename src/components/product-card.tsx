import Image from "next/image";
import Link from "next/link";
import Ratings from "@/components/ratings";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
        <Image src={product.images[0]} alt={product.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{product.title}</h3>
        <div className="text-sm font-semibold text-slate-900">{formatCurrency(product.price)}</div>
      </div>
      <div className="mt-1 text-sm text-slate-600">{product.category}</div>
      <div className="mt-2"><Ratings value={product.rating} /></div>
    </Link>
  );
}
