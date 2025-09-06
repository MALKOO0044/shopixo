import Image from "next/image";
import Link from "next/link";
import Ratings from "@/components/ratings";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

function transformCardImage(url: string): string {
  try {
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
      const marker = '/image/upload/';
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      if (hasTransforms) return url;
      const inject = 'f_auto,q_auto,c_fill,g_auto,w_400,h_400/';
      return url.replace(marker, marker + inject);
    }
  } catch {}
  return url;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-2xl border bg-card p-4 shadow-sm transition will-change-transform hover:-translate-y-1 hover:scale-[1.02] hover:shadow-md"
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
        <Image
          src={transformCardImage(product.images?.[0] || "/placeholder.svg")}
          alt={`صورة المنتج ${product.title}`}
          fill
          sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:768px) 33vw, (min-width:640px) 50vw, 100vw"
          className="object-cover transition-transform duration-150 ease-out group-hover:scale-105"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-base font-semibold text-foreground" title={product.title}>{product.title}</h3>
        <div className="text-lg font-bold text-foreground">{formatCurrency(product.price)}</div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{product.category}</div>
      <div className="mt-2"><Ratings value={product.rating} /></div>
    </Link>
  );
}
