"use client";

import { useState } from "react";
import Image from "next/image";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";
import AddToCart from "@/components/add-to-cart";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

// --- Sub-components (kept from original page) ---
function isLikelyImageUrl(s: string): boolean {
  if (!s) return false;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  if (s.startsWith('/')) return true;
  if (s.startsWith('data:image/')) return true;
  return false;
}
function isLikelyVideoUrl(s: string): boolean {
  if (!s) return false;
  const str = s.trim().toLowerCase();
  if (str.startsWith('data:video/')) return true;
  if (/(\.mp4|\.webm|\.ogg|\.m3u8)(\?|#|$)/.test(str)) return true;
  // Support Cloudinary video via both upload and fetch delivery types
  if (str.includes('res.cloudinary.com') && (str.includes('/video/upload/') || str.includes('/video/fetch/'))) return true;
  // Supabase storage path without scheme – rely on extension
  if (str.startsWith('/storage/v1/object/public/') || /^\/?[^:\/]+\/.+/.test(str)) {
    return /(\.mp4|\.webm|\.ogg|\.m3u8)(\?|#|$)/.test(str);
  }
  return false;
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
    if (url.startsWith('/storage/v1/object/public/')) {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      return `${base.replace(/\/$/, '')}${url}`;
    }
    if (/^\/(?!storage\/v1\/object\/public\/)[^:\/]+\/.+/.test(url)) {
      return buildSupabasePublicUrl(url.slice(1));
    }
    if (/^[^:\/]+\/.+/.test(url)) {
      return buildSupabasePublicUrl(url);
    }
  } catch {}
  return url;
}

function getCloudinaryVideoPoster(url: string): string | null {
  try {
    const u = normalizeImageUrl(url);
    if (typeof u === 'string' && u.includes('res.cloudinary.com') && (u.includes('/video/upload/') || u.includes('/video/fetch/'))) {
      const markerUpload = '/video/upload/';
      const markerFetch = '/video/fetch/';
      const marker = u.includes(markerUpload) ? markerUpload : (u.includes(markerFetch) ? markerFetch : null);
      if (!marker) return null;
      const idx = u.indexOf(marker);
      if (idx === -1) return null;
      const before = u.slice(0, idx + marker.length);
      const after = u.slice(idx + marker.length);
      // so_0 selects first frame; request jpg thumbnail
      const inject = 'so_0/';
      const core = after.replace(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i, '');
      return `${before}${inject}${core}.jpg`;
    }
  } catch {}
  return null;
}

function transformImage(url: string): string {
  try {
    url = normalizeImageUrl(url);
    // Apply Cloudinary transformation if URL matches their pattern and no explicit transformation present
    // Pattern: https://res.cloudinary.com/<cloud>/image/(upload|fetch)/(optional transforms)/<public_id>
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/')) {
      const isUpload = url.includes('/image/upload/');
      const isFetch = url.includes('/image/fetch/');
      const marker = isUpload ? '/image/upload/' : (isFetch ? '/image/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      // Typical no-transform form starts with version segment: v123/...
      // If it already has transforms, the segment will start with letters like c_, f_, t_, etc.
      const hasTransforms = after && !after.startsWith('v');
      if (hasTransforms) {
        return url; // keep existing transforms
      }
      const inject = 'f_auto,q_auto,c_fill,g_auto,w_800,h_800/';
      return url.replace(marker, marker + inject);
    }
  } catch {}
  return url;
}

function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const media = (Array.isArray(images) ? images : [])
    .map((s) => (typeof s === 'string' ? normalizeImageUrl(s) : s))
    .filter((s) => typeof s === 'string') as string[];
  const items = media.length > 0 ? media : ["/placeholder.svg"];
  const [selected, setSelected] = useState(items[0]);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {isLikelyVideoUrl(selected) ? (
          <video
            src={selected}
            className="h-full w-full object-cover"
            controls
            playsInline
          />
        ) : (
          <img
            src={transformImage(selected)}
            alt={`الصورة الرئيسية للمنتج ${title}`}
            className="h-full w-full object-cover"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              if (el.src.endsWith('/placeholder.svg')) return;
              el.src = '/placeholder.svg';
            }}
          />
        )}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-4">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => setSelected(item)}
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-md transition-all",
              "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              selected === item ? "ring-2 ring-primary" : "hover:opacity-80"
            )}
          >
            {isLikelyVideoUrl(item) ? (
              <video
                src={item}
                className="h-full w-full object-cover"
                muted
                playsInline
                poster={getCloudinaryVideoPoster(item) || undefined}
              />
            ) : (
              <img
                src={transformImage(item)}
                alt={`مصغّر ${index + 1} للمنتج ${title}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  if (el.src.endsWith('/placeholder.svg')) return;
                  el.src = '/placeholder.svg';
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductOptions({ variants, onOptionChange }: { variants: any[]; onOptionChange: (name: string, value: string) => void }) {
  return (
    <div className="mt-6 space-y-6">
      {variants.map((variant) => (
        <div key={variant.name}>
          <Label className="text-sm font-medium text-foreground">{variant.name}</Label>
          <RadioGroup
            defaultValue={variant.options[0]}
            className="mt-2 flex flex-wrap gap-2"
            onValueChange={(value: string) => onOptionChange(variant.name, value)}
            name={variant.name}
          >
            {variant.options.map((option: string) => (
              <div key={option}>
                <RadioGroupItem value={option} id={`${variant.name}-${option}`} className="sr-only" />
                <Label
                  htmlFor={`${variant.name}-${option}`}
                  className="cursor-pointer rounded-md border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
    </div>
  );
}

// --- Main Client Component ---
export default function ProductDetailsClient({ product, children }: { product: Product, children?: React.ReactNode }) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initialOptions: Record<string, string> = {};
    product.variants?.forEach((v) => {
      initialOptions[v.name] = v.options[0];
    });
    return initialOptions;
  });

  const handleOptionChange = (name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery images={product.images} title={product.title} />
      <div>
        <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-2xl font-semibold text-primary">{formatCurrency(product.price)}</span>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            isOutOfStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          )}>
            {isOutOfStock ? 'غير متوفر' : 'متوفر'}
          </span>
        </div>
        <p className="mt-4 text-muted-foreground">{product.description}</p>
        
        {product.variants?.length ? (
          <ProductOptions variants={product.variants} onOptionChange={handleOptionChange} />
        ) : null}

        {/* Desktop CTA */}
        <div className="mt-8 hidden md:block">
          <AddToCart productId={product.id} productSlug={product.slug as any} selectedOptions={selectedOptions} disabled={isOutOfStock} />
        </div>

        {/* Price comparison component will be passed as a child */}
        {children}

        <div className="mt-8 text-sm text-muted-foreground">
          <p>• شحن مجاني للطلبات فوق 100</p>
          <p>• ضمان استرجاع خلال 30 يومًا</p>
          <p>• دفع آمن عبر Stripe</p>
        </div>
      </div>
      {/* Mobile sticky Add-to-Cart bar */}
      <div className="md:hidden" aria-hidden={false}>
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">السعر</div>
              <div className="text-lg font-semibold text-primary">{formatCurrency(product.price)}</div>
            </div>
            <div className="flex-1">
              <AddToCart productId={product.id} productSlug={product.slug as any} selectedOptions={selectedOptions} disabled={isOutOfStock} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
