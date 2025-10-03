"use client";

import { useState, useRef, useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/lib/types";
import AddToCart from "@/components/add-to-cart";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import SmartImage from "@/components/smart-image";
import { computeBilledWeightKg, resolveDdpShippingSar } from "@/lib/pricing";

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

function videoMimeFromUrl(url: string): string | undefined {
  try {
    const u = normalizeImageUrl(url).toLowerCase();
    if (u.includes('.mp4')) return 'video/mp4';
    if (u.includes('.webm')) return 'video/webm';
    if (u.includes('.ogg')) return 'video/ogg';
    if (u.includes('.m3u8')) return 'application/vnd.apple.mpegURL';
  } catch {}
  return undefined;
}

function transformVideo(url: string): string {
  try {
    url = normalizeImageUrl(url);
    // For Cloudinary video, force delivery in MP4 for wide compatibility
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/video/')) {
      const isUpload = url.includes('/video/upload/');
      const isFetch = url.includes('/video/fetch/');
      const marker = isUpload ? '/video/upload/' : (isFetch ? '/video/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      const before = url.slice(0, idx + marker.length);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      // Always inject f_mp4,vc_h264 for maximum compatibility if no transforms
      const inject = 'f_mp4,vc_h264/';
      const core = hasTransforms ? after : (inject + after);
      // Ensure .mp4 extension for the final URL
      return (before + core).replace(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i, '.mp4');
    }
    // For non-Cloudinary remote URLs (e.g., Supabase public), if a public cloud name is available,
    // wrap with Cloudinary fetch to deliver MP4 universally.
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const isHttp = typeof url === 'string' && /^https?:\/\//i.test(url);
    const isMp4 = typeof url === 'string' && /\.mp4(\?|#|$)/i.test(url);
    if (cloud && isHttp && !isMp4) {
      return `https://res.cloudinary.com/${cloud}/video/fetch/f_mp4,vc_h264/${encodeURIComponent(url)}`;
    }
  } catch {}
  return url;
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

  // Zoom overlay state
  const [zoomOpen, setZoomOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function openZoom() {
    setScale(1); setTx(0); setTy(0); setZoomOpen(true);
  }
  function closeZoom() {
    setZoomOpen(false);
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale((s) => Math.min(4, Math.max(1, +(s + delta).toFixed(2))));
  }
  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTx(dragStart.current.tx + dx);
    setTy(dragStart.current.ty + dy);
  }
  function onPointerUp(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
    dragStart.current = null;
  }

  return (
    <div>
      <div
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100"
        onClick={() => !isLikelyVideoUrl(selected) && openZoom()}
        role={!isLikelyVideoUrl(selected) ? 'button' : undefined}
        aria-label={!isLikelyVideoUrl(selected) ? 'تكبير الصورة' : undefined}
      >
        {isLikelyVideoUrl(selected) ? (
          <video
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            poster={getCloudinaryVideoPoster(selected) || undefined}
          >
            <source src={transformVideo(selected)} type={videoMimeFromUrl(selected)} />
          </video>
        ) : (
          <SmartImage
            src={transformImage(selected)}
            alt={`الصورة الرئيسية للمنتج ${title}`}
            className="h-full w-full cursor-zoom-in object-cover"
            loading="eager"
            fill
            onError={(e: any) => {
              try {
                const el = e.currentTarget as HTMLImageElement;
                if (el && !el.src.endsWith('/placeholder.svg')) {
                  el.src = '/placeholder.svg';
                }
              } catch {}
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
                src={transformVideo(item)}
                className="h-full w-full object-cover"
                muted
                playsInline
                poster={getCloudinaryVideoPoster(item) || undefined}
              />
            ) : (
              <SmartImage
                src={transformImage(item)}
                alt={`مصغّر ${index + 1} للمنتج ${title}`}
                loading="lazy"
                className="h-full w-full object-cover"
                fill
                onError={(e: any) => {
                  try {
                    const el = e.currentTarget as HTMLImageElement;
                    if (el && !el.src.endsWith('/placeholder.svg')) {
                      el.src = '/placeholder.svg';
                    }
                  } catch {}
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Zoom Overlay */}
      {zoomOpen && !isLikelyVideoUrl(selected) && (
        <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/60" onClick={closeZoom} />
          <div className="absolute inset-0 mx-auto flex max-w-5xl items-center justify-center p-4">
            <div className="relative h-[80vh] w-full overflow-hidden rounded-lg bg-black">
              <button
                aria-label="إغلاق"
                onClick={closeZoom}
                className="absolute right-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-sm hover:bg-white"
              >
                إغلاق
              </button>
              <div className="absolute left-3 top-3 z-10 flex gap-2">
                <button onClick={() => setScale((s) => Math.min(4, +(s + 0.2).toFixed(2)))} className="rounded-md bg-white/90 px-2 py-1 text-sm hover:bg-white">+</button>
                <button onClick={() => setScale((s) => Math.max(1, +(s - 0.2).toFixed(2)))} className="rounded-md bg-white/90 px-2 py-1 text-sm hover:bg-white">-</button>
                <button onClick={() => { setScale(1); setTx(0); setTy(0); }} className="rounded-md bg-white/90 px-2 py-1 text-sm hover:bg-white">إعادة الضبط</button>
              </div>
              <div
                className="absolute inset-0 touch-pan-y"
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={transformImage(selected)}
                  alt={`تكبير - ${title}`}
                  className="pointer-events-none select-none"
                  style={{
                    transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    maxWidth: 'unset',
                    maxHeight: 'unset',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductOptions({ variants, onOptionChange, selected }: { variants: { name: string; options: string[] }; onOptionChange: (name: string, value: string) => void; selected?: string }) {
  return (
    <div className="mt-6 space-y-6">
      <div>
        <Label className="text-sm font-medium text-foreground">{variants.name}</Label>
        <RadioGroup
          defaultValue={selected || variants.options[0]}
          className="mt-2 flex flex-wrap gap-2"
          onValueChange={(value: string) => onOptionChange(variants.name, value)}
          name={variants.name}
        >
          {variants.options.map((option: string) => (
            <div key={option}>
              <RadioGroupItem value={option} id={`${variants.name}-${option}`} className="sr-only" />
              <Label
                htmlFor={`${variants.name}-${option}`}
                className="cursor-pointer rounded-md border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}

// --- Main Client Component ---
export default function ProductDetailsClient({ product, variantRows, children }: { product: Product, variantRows?: ProductVariant[], children?: React.ReactNode }) {
  const uiVariant = useMemo(() => {
    if (Array.isArray(variantRows) && variantRows.length > 0) {
      const name = variantRows[0].option_name || 'Size';
      const options = Array.from(new Set(variantRows.map(v => v.option_value))).filter(Boolean);
      return { name, options };
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants[0];
    }
    return { name: 'Size', options: [] as string[] };
  }, [variantRows, product.variants]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (uiVariant.options.length > 0) initial[uiVariant.name] = uiVariant.options[0];
    return initial;
  });

  const handleOptionChange = (name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  };

  const isOutOfStock = product.stock <= 0;

  const selectedVariant = useMemo(() => {
    if (!variantRows || variantRows.length === 0) return null;
    const name = uiVariant.name;
    const value = selectedOptions[name];
    if (!value) return null;
    return variantRows.find(v => (v.option_name || 'Size') === name && v.option_value === value) || null;
  }, [variantRows, selectedOptions, uiVariant.name]);

  const addToCartDisabled = isOutOfStock || (!!variantRows?.length && (!!selectedVariant ? selectedVariant.stock <= 0 : true));

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery images={product.images} title={product.title} />
      <div>
        <h1 className="text-3xl font-bold text-foreground">{product.title}</h1>
        <div className="mt-2 flex items-center gap-4">
          <span className="text-2xl font-semibold text-primary">{formatCurrency(selectedVariant?.price ?? product.price)}</span>
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            isOutOfStock ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          )}>
            {isOutOfStock ? 'غير متوفر' : 'متوفر'}
          </span>
        </div>
        <p className="mt-4 text-muted-foreground">{product.description}</p>
        
        {uiVariant.options.length > 0 ? (
          <ProductOptions variants={uiVariant} onOptionChange={handleOptionChange} selected={selectedOptions[uiVariant.name]} />
        ) : null}

        {variantRows && variantRows.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-foreground">تفاصيل المخزون</h3>
            <div className="overflow-auto rounded border">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left">المقاس</th>
                    <th className="p-2 text-right">السعر</th>
                    <th className="p-2 text-right">المتبقي</th>
                    <th className="p-2 text-left">SKU</th>
                  </tr>
                </thead>
                <tbody>
                  {([...variantRows].sort((a,b) => {
                    const order = ['XS','S','M','L','XL','XXL','XXXL','XXXXL'];
                    const ia = order.indexOf(String(a.option_value).toUpperCase());
                    const ib = order.indexOf(String(b.option_value).toUpperCase());
                    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                  })).map(v => (
                    <tr key={v.id} className="border-t">
                      <td className="p-2">{v.option_value}</td>
                      <td className="p-2 text-right">{formatCurrency((v.price ?? product.price))}</td>
                      <td className="p-2 text-right">{v.stock}</td>
                      <td className="p-2">{v.cj_sku || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Desktop CTA */}
        <div className="mt-8 hidden md:block">
          <AddToCart productId={product.id} productSlug={product.slug as any} selectedOptions={selectedOptions} disabled={addToCartDisabled} />
        </div>

        {/* Price comparison component will be passed as a child */}
        {children}
        {/* Shipping and fulfillment info (estimated) */}
        <div className="mt-8 text-sm space-y-2 rounded-md border bg-card p-4">
          <div className="font-medium">الشحن والتسليم (تقديري)</div>
          {(() => {
            const sel = selectedVariant;
            if (!sel) return (<p className="text-muted-foreground">اختر المقاس لعرض الشحن والإجمالي.</p>);
            const actualKg = typeof sel.weight_grams === 'number' && sel.weight_grams > 0 ? sel.weight_grams / 1000 : 0.4;
            const L = typeof sel.length_cm === 'number' ? sel.length_cm : 30;
            const W = typeof sel.width_cm === 'number' ? sel.width_cm : 25;
            const H = typeof sel.height_cm === 'number' ? sel.height_cm : 5;
            const billedKg = computeBilledWeightKg({ actualKg, lengthCm: L, widthCm: W, heightCm: H });
            const ddp = resolveDdpShippingSar(billedKg);
            const itemPrice = sel.price ?? product.price;
            return (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">رسوم الشحن (DDP)</div>
                  <div>{formatCurrency(ddp)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">الإجمالي</div>
                  <div>{formatCurrency(itemPrice + ddp)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">مدة المعالجة</div>
                  <div>{typeof (product as any).processing_time_hours === 'number' ? `${Math.max(1, Math.round((product as any).processing_time_hours / 24))}–${Math.max(1, Math.ceil(((product as any).processing_time_hours + 24) / 24))} أيام` : '—'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">مدة التوصيل</div>
                  <div>{typeof (product as any).delivery_time_hours === 'number' ? `${Math.max(1, Math.round((product as any).delivery_time_hours / 24))}–${Math.max(1, Math.ceil(((product as any).delivery_time_hours + 24) / 24))} أيام` : '—'}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {/* Mobile sticky Add-to-Cart bar */}
      <div className="md:hidden" aria-hidden={false}>
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">السعر</div>
              <div className="text-lg font-semibold text-primary">{formatCurrency(selectedVariant?.price ?? product.price)}</div>
            </div>
            <div className="flex-1">
              <AddToCart productId={product.id} productSlug={product.slug as any} selectedOptions={selectedOptions} disabled={addToCartDisabled} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
