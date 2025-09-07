import Link from "next/link";
import Ratings from "@/components/ratings";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";

function isLikelyImageUrl(s: string): boolean {
  if (!s) return false;
  const str = s.trim();
  if (str.startsWith('data:image/')) return true;
  const imageExt = /\.(png|jpe?g|webp|gif|avif|svg)(\?|#|$)/i;
  if (imageExt.test(str)) return true;
  // Accept both Cloudinary upload and fetch delivery types
  if (str.includes('res.cloudinary.com') && str.includes('/image/')) return true;
  if (str.startsWith('/storage/v1/object/public/')) return imageExt.test(str);
  if (/^\/?[^:\/]+\/.+/.test(str)) return imageExt.test(str); // bucket/path with image ext
  return false;
}

function isLikelyVideoUrl(s: string): boolean {
  if (!s) return false;
  const str = s.trim().toLowerCase();
  if (str.startsWith('data:video/')) return true;
  if (/(\.mp4|\.webm|\.ogg|\.m3u8)(\?|#|$)/.test(str)) return true;
  if (str.includes('res.cloudinary.com') && str.includes('/video/')) return true;
  if (str.startsWith('/storage/v1/object/public/') || /^\/?[^:\/]+\/.+/.test(str)) {
    return /(\.mp4|\.webm|\.ogg|\.m3u8)(\?|#|$)/.test(str);
  }
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

function pickPrimaryMedia(images: any): string | null {
  // Returns first image; if none, returns first video. Accepts array/JSON/comma-separated/string.
  try {
    const tryParse = (raw: any): string[] => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw.filter((s) => typeof s === 'string');
      if (typeof raw === 'string') {
        const s = raw.trim();
        if (!s) return [];
        if (s.startsWith('[') && s.endsWith(']')) {
          try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr.filter((x: any) => typeof x === 'string') : []; } catch { return []; }
        }
        if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
        return [s];
      }
      return [];
    };
    const arr = tryParse(images);
    const img = arr.find((u) => isLikelyImageUrl(u));
    if (img) return img;
    const vid = arr.find((u) => isLikelyVideoUrl(u));
    return vid || null;
  } catch {}
  return null;
}

function buildSupabasePublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  const cleaned = path.replace(/^\/+/, "");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${cleaned}`;
}

function normalizeImageUrl(url: string): string {
  try {
    if (!url) return url;
    if (url.startsWith('http://')) return 'https://' + url.slice('http://'.length);
    if (url.startsWith('https://') || url.startsWith('data:')) return url;
    // '/storage/v1/object/public/...' -> prefix Supabase base URL
    if (url.startsWith('/storage/v1/object/public/')) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      return `${base.replace(/\/$/, '')}${url}`;
    }
    // '/bucket/dir/file.jpg' -> treat as Supabase public bucket path
    if (/^\/(?!storage\/v1\/object\/public\/)[^:\/]+\/.+/.test(url)) {
      return buildSupabasePublicUrl(url.slice(1));
    }
    // Already handled: absolute http(s), data URLs. For relative without leading '/', try Supabase bucket form
    // Treat plain 'bucket/dir/file.jpg' as Supabase public storage object
    if (/^[^:\/]+\/.+/.test(url)) {
      return buildSupabasePublicUrl(url);
    }
  } catch {}
  return url;
}

function transformCardImage(url: string): string {
  try {
    url = normalizeImageUrl(url);
    // If it's a Cloudinary video, derive a poster from first frame
    if (isLikelyVideoUrl(url) && url.includes('res.cloudinary.com') && url.includes('/video/')) {
      const marker = url.includes('/video/upload/') ? '/video/upload/' : (url.includes('/video/fetch/') ? '/video/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      if (idx !== -1) {
        const before = url.slice(0, idx + marker.length);
        const after = url.slice(idx + marker.length);
        const inject = 'so_0/';
        const core = after.replace(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i, '');
        return `${before}${inject}${core}.jpg`;
      }
    }
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/')) {
      const isUpload = url.includes('/image/upload/');
      const isFetch = url.includes('/image/fetch/');
      const marker = isUpload ? '/image/upload/' : (isFetch ? '/image/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      if (hasTransforms) return url;
      // 4:3 aspect for grid thumbnails
      const inject = 'f_auto,q_auto,c_fill,g_auto,w_640,h_480/';
      return url.replace(marker, marker + inject);
    }
  } catch {}
  return url || '/placeholder.svg';
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
        <img
          src={transformCardImage(pickPrimaryMedia(getImageField(product as any)) || "/placeholder.svg")}
          alt={`صورة المنتج ${product.title}`}
          className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el.src.endsWith('/placeholder.svg')) return;
            el.src = '/placeholder.svg';
          }}
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
