import Image from "next/image";
import Link from "next/link";
import Ratings from "@/components/ratings";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

function isLikelyImageUrl(s: string): boolean {
  if (!s) return false;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  if (s.startsWith('/')) return true;
  if (s.startsWith('data:image/')) return true;
  return false;
}

function pickPrimaryImage(images: any): string | null {
  try {
    if (!images) return null;
    if (Array.isArray(images)) {
      const v = images.find((s) => typeof s === 'string' && isLikelyImageUrl(s.trim())) as string | undefined;
      return v || null;
    }
    if (typeof images === 'string') {
      const s = images.trim();
      if (!s) return null;
      if (s.startsWith('[') && s.endsWith(']')) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const v = parsed.find((x) => typeof x === 'string' && isLikelyImageUrl(x.trim()));
          return (v as string) || null;
        }
      }
      if (s.includes(',')) {
        const v = s.split(',').map((x) => x.trim()).find((x) => isLikelyImageUrl(x));
        return v || null;
      }
      return isLikelyImageUrl(s) ? s : null; // single value must look like URL
    }
  } catch {}
  return null;
}

function normalizeImageUrl(url: string): string {
  try {
    if (!url) return url;
    if (url.startsWith('http://')) return 'https://' + url.slice('http://'.length);
  } catch {}
  return url;
}

function transformCardImage(url: string): string {
  try {
    url = normalizeImageUrl(url);
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
      const marker = '/image/upload/';
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      if (hasTransforms) return url;
      // 4:3 aspect for grid thumbnails
      const inject = 'f_auto,q_auto,c_fill,g_auto,w_640,h_480/';
      return url.replace(marker, marker + inject);
    }
  } catch {}
  return url;
}

function getImageField(p: any): any {
  return typeof p?.images !== 'undefined' && p?.images !== null && p?.images !== ''
    ? p.images
    : p?.image ?? null;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-[var(--radius-lg)] border bg-card p-5 shadow-soft transition will-change-transform hover:-translate-y-[6px] hover:shadow-soft"
    >
      <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-image bg-slate-100">
        <Image
          src={transformCardImage(pickPrimaryImage(getImageField(product as any)) || "/placeholder.svg")}
          alt={`صورة المنتج ${product.title}`}
          fill
          sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:768px) 33vw, (min-width:640px) 50vw, 100vw"
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          unoptimized
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
