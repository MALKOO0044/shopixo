"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/lib/types";
import AddToCart from "@/components/add-to-cart";
import SmartImage from "@/components/smart-image";
import { Heart, Star, ChevronUp, ChevronDown, X, Plus, Minus, Truck, Shield, RotateCcw, Ruler } from "lucide-react";
import SizeGuideModal from "@/components/product/SizeGuideModal";
import ProductTabs from "@/components/product/ProductTabs";
import YouMayAlsoLike from "@/components/product/YouMayAlsoLike";
import MakeItAMatch from "@/components/product/MakeItAMatch";
import { computeBilledWeightKg, resolveDdpShippingSar } from "@/lib/pricing";

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
  if (str.includes('res.cloudinary.com') && (str.includes('/video/upload/') || str.includes('/video/fetch/'))) return true;
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
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/video/')) {
      const isUpload = url.includes('/video/upload/');
      const isFetch = url.includes('/video/fetch/');
      const marker = isUpload ? '/video/upload/' : (isFetch ? '/video/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      const before = url.slice(0, idx + marker.length);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      const inject = 'f_mp4,vc_h264/';
      const core = hasTransforms ? after : (inject + after);
      return (before + core).replace(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i, '.mp4');
    }
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
    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/')) {
      const isUpload = url.includes('/image/upload/');
      const isFetch = url.includes('/image/fetch/');
      const marker = isUpload ? '/image/upload/' : (isFetch ? '/image/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      if (hasTransforms) return url;
      const inject = 'f_auto,q_auto,c_fill,g_auto,w_800,h_800/';
      return url.replace(marker, marker + inject);
    }
  } catch {}
  return url;
}

interface MediaGalleryProps {
  images: string[];
  title: string;
  videoUrl?: string | null;
  selectedColor?: string;
}

function MediaGallery({ images, title, videoUrl }: MediaGalleryProps) {
  const media = (Array.isArray(images) ? images : [])
    .map((s) => (typeof s === 'string' ? normalizeImageUrl(s) : s))
    .filter((s) => typeof s === 'string') as string[];
  
  const items = (() => {
    const arr = [...media];
    if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim()) arr.unshift(videoUrl.trim());
    return arr.length > 0 ? arr : ["/placeholder.svg"];
  })();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = items[selectedIndex] || items[0];
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  const [zoomOpen, setZoomOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  function openZoom() {
    setScale(1); setTx(0); setTy(0); setZoomOpen(true);
  }
  function closeZoom() { setZoomOpen(false); }

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

  const scrollThumbnails = (direction: 'up' | 'down') => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = 80;
      thumbnailContainerRef.current.scrollBy({
        top: direction === 'up' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex gap-3 h-full" dir="ltr">
      <div
        className="relative flex-1 aspect-[3/4] md:aspect-square rounded-lg overflow-hidden bg-muted cursor-zoom-in"
        onClick={() => !isLikelyVideoUrl(selected) && openZoom()}
        role={!isLikelyVideoUrl(selected) ? 'button' : undefined}
        aria-label={!isLikelyVideoUrl(selected) ? 'Zoom image' : undefined}
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
            alt={title}
            fill
            className="object-cover"
            loading="eager"
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

      <div className="flex flex-col items-center gap-2 w-16 md:w-20 shrink-0">
        {items.length > 4 && (
          <button
            onClick={() => scrollThumbnails('up')}
            className="w-full flex items-center justify-center py-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Scroll up"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}
        
        <div
          ref={thumbnailContainerRef}
          className="flex flex-col gap-2 overflow-y-auto scrollbar-hide max-h-[400px] md:max-h-[500px]"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative w-14 h-14 md:w-16 md:h-16 rounded-md overflow-hidden border-2 transition-all shrink-0",
                selectedIndex === index 
                  ? "border-primary ring-1 ring-primary" 
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              {isLikelyVideoUrl(item) ? (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[8px] border-l-foreground border-y-[5px] border-y-transparent" />
                </div>
              ) : (
                <SmartImage
                  src={transformImage(item)}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover"
                  loading="lazy"
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

        {items.length > 4 && (
          <button
            onClick={() => scrollThumbnails('down')}
            className="w-full flex items-center justify-center py-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Scroll down"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {zoomOpen && !isLikelyVideoUrl(selected) && (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/80" onClick={closeZoom} />
          <button
            aria-label="Close"
            onClick={closeZoom}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/90 p-2 hover:bg-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button onClick={() => setScale((s) => Math.min(4, +(s + 0.2).toFixed(2)))} className="rounded-full bg-white/90 p-2 hover:bg-white transition-colors">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={() => setScale((s) => Math.max(1, +(s - 0.2).toFixed(2)))} className="rounded-full bg-white/90 p-2 hover:bg-white transition-colors">
              <Minus className="w-5 h-5" />
            </button>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center touch-pan-y"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={transformImage(selected)}
              alt={title}
              className="pointer-events-none select-none max-w-[90vw] max-h-[90vh]"
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface DetailHeaderProps {
  title: string;
  productCode?: string | null;
  rating: number;
  reviewCount?: number;
}

function DetailHeader({ title, productCode, rating, reviewCount = 0 }: DetailHeaderProps) {
  const displayRating = Math.min(5, Math.max(0, rating));
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 >= 0.5;

  return (
    <div className="space-y-2">
      <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">
        {title}
      </h1>
      
      {productCode && (
        <p className="text-sm text-muted-foreground">
          Product Code: <span className="font-mono text-foreground">{productCode}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-4 h-4",
                i < fullStars 
                  ? "fill-amber-400 text-amber-400" 
                  : i === fullStars && hasHalfStar
                    ? "fill-amber-400/50 text-amber-400"
                    : "fill-muted text-muted"
              )}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {reviewCount > 0 ? `${reviewCount.toLocaleString('en-US')}+ reviews` : 'No reviews yet'}
        </span>
      </div>
    </div>
  );
}

interface PriceBlockProps {
  price: number;
  originalPrice?: number;
  isAvailable: boolean;
}

function PriceBlock({ price, originalPrice, isAvailable }: PriceBlockProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-xl md:text-2xl font-bold text-foreground">
          {formatCurrency(price)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-base text-muted-foreground line-through">
              {formatCurrency(originalPrice)}
            </span>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-sm font-medium rounded">
              -{discountPercent}%
            </span>
          </>
        )}
      </div>
      <div className={cn(
        "text-sm font-medium",
        isAvailable ? "text-green-600" : "text-red-600"
      )}>
        {isAvailable ? 'In Stock' : 'Out of Stock'}
      </div>
    </div>
  );
}

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string;
  onColorChange: (color: string) => void;
  colorImages?: Record<string, string>;
  hotColors?: string[];
}

function ColorSelector({ colors, selectedColor, onColorChange, colorImages = {}, hotColors = [] }: ColorSelectorProps) {
  if (colors.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Color:</span>
        <span className="text-sm text-muted-foreground">{selectedColor}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => {
          const isSelected = color === selectedColor;
          const isHot = hotColors.includes(color);
          const imageUrl = colorImages[color];

          return (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={cn(
                "relative w-12 h-12 md:w-14 md:h-14 rounded-md overflow-hidden border-2 transition-all",
                isSelected 
                  ? "border-primary ring-2 ring-primary ring-offset-2" 
                  : "border-muted hover:border-muted-foreground/50"
              )}
              title={color}
            >
              {imageUrl ? (
                <SmartImage
                  src={transformImage(imageUrl)}
                  alt={color}
                  fill
                  className="object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {color.slice(0, 2)}
                </div>
              )}
              {isHot && (
                <span className="absolute -top-1 -right-1 px-1 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                  HOT
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SizeSelectorProps {
  sizes: string[];
  selectedSize: string;
  onSizeChange: (size: string) => void;
  sizeStock?: Record<string, number>;
}

function SizeSelector({ sizes, selectedSize, onSizeChange, sizeStock = {} }: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Size:</span>
        <span className="text-sm text-muted-foreground">{selectedSize}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = size === selectedSize;
          const stock = sizeStock[size] ?? 0;
          const isOutOfStock = stock <= 0;
          const isLowStock = stock > 0 && stock <= 3;

          return (
            <button
              key={size}
              onClick={() => !isOutOfStock && onSizeChange(size)}
              disabled={isOutOfStock}
              className={cn(
                "relative min-w-[48px] px-4 py-2 rounded-md text-sm font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isOutOfStock
                    ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                    : "bg-card border border-border hover:border-primary text-foreground"
              )}
            >
              {size}
              {isLowStock && !isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
      {sizeStock[selectedSize] !== undefined && sizeStock[selectedSize] > 0 && sizeStock[selectedSize] <= 3 && (
        <p className="text-sm text-amber-600">
          Only {sizeStock[selectedSize]} left!
        </p>
      )}
    </div>
  );
}

interface ActionPanelProps {
  productId: number;
  productSlug: string;
  selectedOptions: Record<string, string>;
  disabled: boolean;
  onWishlistToggle?: () => void;
  isWishlisted?: boolean;
}

function ActionPanel({ productId, productSlug, selectedOptions, disabled, onWishlistToggle, isWishlisted = false }: ActionPanelProps) {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <AddToCart 
          productId={productId} 
          productSlug={productSlug as any} 
          selectedOptions={selectedOptions} 
          disabled={disabled} 
        />
      </div>
      {onWishlistToggle && (
        <button
          onClick={onWishlistToggle}
          className={cn(
            "w-12 h-12 flex items-center justify-center rounded-md border transition-colors",
            isWishlisted 
              ? "bg-red-50 border-red-200 text-red-500" 
              : "bg-card border-border text-muted-foreground hover:text-red-500 hover:border-red-200"
          )}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={cn("w-5 h-5", isWishlisted && "fill-current")} />
        </button>
      )}
    </div>
  );
}

interface ShippingInfoProps {
  cjPid?: string;
  quote: { retailSar: number; shippingSar: number; options: any[] } | null;
  quoteLoading: boolean;
  selectedVariant: ProductVariant | null;
  product: Product;
}

function ShippingInfo({ cjPid, quote, quoteLoading, selectedVariant, product }: ShippingInfoProps) {
  const hasLiveQuote = cjPid && quote;
  
  const fallbackShipping = useMemo(() => {
    if (!selectedVariant) return null;
    const actualKg = typeof selectedVariant.weight_grams === 'number' && selectedVariant.weight_grams > 0 
      ? selectedVariant.weight_grams / 1000 
      : 0.4;
    const L = typeof selectedVariant.length_cm === 'number' ? selectedVariant.length_cm : 30;
    const W = typeof selectedVariant.width_cm === 'number' ? selectedVariant.width_cm : 25;
    const H = typeof selectedVariant.height_cm === 'number' ? selectedVariant.height_cm : 5;
    const billedKg = computeBilledWeightKg({ actualKg, lengthCm: L, widthCm: W, heightCm: H });
    const ddp = resolveDdpShippingSar(billedKg);
    return { ddp, total: (selectedVariant.price ?? product.price) + ddp };
  }, [selectedVariant, product.price]);

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-3 gap-4 pb-3 border-b">
        <div className="flex flex-col items-center gap-1 text-center">
          <Truck className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Fast Shipping</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Secure Payment</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Easy Returns</span>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="font-medium">Shipping & Delivery (Estimated)</div>
        
        {((product as any).origin_area || (product as any).origin_country_code) && (
          <div className="text-xs text-muted-foreground">
            Ships from: {(product as any).origin_area || '-'}
            {(product as any).origin_country_code ? `, ${(product as any).origin_country_code}` : ''}
          </div>
        )}
        
        {!selectedVariant && (
          <p className="text-muted-foreground">Select a size to view shipping and total.</p>
        )}
        
        {selectedVariant && quoteLoading && (
          <p className="text-muted-foreground">Calculating shipping cost...</p>
        )}
        
        {selectedVariant && !quoteLoading && hasLiveQuote && quote && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-muted-foreground">Cheapest Shipping</div>
                <div className="font-medium">{formatCurrency(quote.shippingSar)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Delivery Price</div>
                <div className="font-medium">{formatCurrency(quote.retailSar)}</div>
              </div>
            </div>
            {quote.options.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1">Shipping Options</div>
                <ul className="list-disc pr-5 text-xs space-y-1">
                  {quote.options.slice(0, 3).map((o: any, i: number) => {
                    const rng = o.logisticAgingDays;
                    const days = rng ? (rng.max ? `${rng.min || rng.max}-${rng.max} days` : `${rng.min} days`) : null;
                    return (
                      <li key={i}>{o.name || o.code}: {formatCurrency(Number(o.price || 0))}{days ? ` · ${days}` : ''}</li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
        
        {selectedVariant && !quoteLoading && !hasLiveQuote && fallbackShipping && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-muted-foreground">Shipping Fee (DDP)</div>
              <div className="font-medium">{formatCurrency(fallbackShipping.ddp)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="font-medium">{formatCurrency(fallbackShipping.total)}</div>
            </div>
          </div>
        )}
        
        {selectedVariant && !quoteLoading && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <div className="text-muted-foreground">Processing Time</div>
              <div className="text-foreground">
                {typeof (product as any).processing_time_hours === 'number' 
                  ? `${Math.max(1, Math.round((product as any).processing_time_hours / 24))}–${Math.max(1, Math.ceil(((product as any).processing_time_hours + 24) / 24))} days` 
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Delivery Time</div>
              <div className="text-foreground">
                {typeof (product as any).delivery_time_hours === 'number' 
                  ? `${Math.max(1, Math.round((product as any).delivery_time_hours / 24))}–${Math.max(1, Math.ceil(((product as any).delivery_time_hours + 24) / 24))} days` 
                  : '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductDetailsClient({ 
  product, 
  variantRows, 
  children 
}: { 
  product: Product; 
  variantRows?: ProductVariant[]; 
  children?: React.ReactNode;
}) {
  function splitColorSize(v: string): { color?: string; size?: string } {
    if (!v) return {};
    const parts = String(v).split('/').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) return { color: parts[0] || undefined, size: parts[1] || undefined };
    const parts2 = String(v).split('-').map(s => s.trim()).filter(Boolean);
    if (parts2.length >= 2) return { color: parts2[0] || undefined, size: parts2[1] || undefined };
    return { size: v };
  }

  const hasRows = Array.isArray(variantRows) && variantRows.length > 0;
  
  const bothDims = useMemo(() => {
    if (!hasRows) return false;
    const withSep = (variantRows || []).filter(r => /\s\/\s|\s-\s/.test(String(r.option_value)));
    return withSep.length >= Math.max(1, Math.floor((variantRows || []).length * 0.6));
  }, [hasRows, variantRows]);

  const colorOptions = useMemo(() => {
    if (!hasRows || !bothDims) return [] as string[];
    const set = new Set<string>();
    for (const r of variantRows!) {
      const cs = splitColorSize(r.option_value || '');
      if (cs.color) set.add(cs.color);
    }
    return Array.from(set);
  }, [hasRows, bothDims, variantRows]);

  const sizeOptionsByColor = useMemo(() => {
    if (!hasRows || !bothDims) return {} as Record<string, string[]>;
    const map: Record<string, Set<string>> = {};
    for (const r of variantRows!) {
      const cs = splitColorSize(r.option_value || '');
      if (!cs.color || !cs.size) continue;
      if (!map[cs.color]) map[cs.color] = new Set<string>();
      map[cs.color].add(cs.size);
    }
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(map)) out[k] = Array.from(map[k]);
    return out;
  }, [hasRows, bothDims, variantRows]);

  const singleDimOptions = useMemo(() => {
    if (!hasRows || bothDims) return [] as string[];
    return Array.from(new Set(variantRows!.map(v => v.option_value))).filter(Boolean);
  }, [hasRows, bothDims, variantRows]);

  const singleDimName = useMemo(() => {
    if (!hasRows || bothDims) return 'Size';
    return variantRows![0]?.option_name || 'Size';
  }, [hasRows, bothDims, variantRows]);

  const twoDimNames = useMemo(() => {
    if (!hasRows || !bothDims) return { color: 'Color', size: 'Size' };
    const first = variantRows![0];
    const optName = first?.option_name || '';
    if (optName.includes('/')) {
      const parts = optName.split('/').map(s => s.trim());
      return { color: parts[0] || 'Color', size: parts[1] || 'Size' };
    }
    if (optName.includes('-')) {
      const parts = optName.split('-').map(s => s.trim());
      return { color: parts[0] || 'Color', size: parts[1] || 'Size' };
    }
    return { color: 'Color', size: 'Size' };
  }, [hasRows, bothDims, variantRows]);

  const [selectedColor, setSelectedColor] = useState(() => colorOptions[0] || '');
  const [selectedSize, setSelectedSize] = useState(() => {
    if (bothDims && colorOptions[0]) {
      return (sizeOptionsByColor[colorOptions[0]] || [])[0] || '';
    }
    return singleDimOptions[0] || '';
  });

  useEffect(() => {
    if (selectedColor && sizeOptionsByColor[selectedColor]) {
      const sizes = sizeOptionsByColor[selectedColor];
      if (!sizes.includes(selectedSize)) {
        setSelectedSize(sizes[0] || '');
      }
    }
  }, [selectedColor, sizeOptionsByColor, selectedSize]);

  const selectedOptions = useMemo(() => {
    const opts: Record<string, string> = {};
    if (bothDims) {
      if (selectedColor) opts[twoDimNames.color] = selectedColor;
      if (selectedSize) opts[twoDimNames.size] = selectedSize;
    } else if (singleDimOptions.length > 0) {
      opts[singleDimName] = selectedSize;
    }
    return opts;
  }, [bothDims, selectedColor, selectedSize, singleDimOptions.length, singleDimName, twoDimNames]);

  const selectedVariant = useMemo(() => {
    if (!variantRows || variantRows.length === 0) return null;
    if (bothDims) {
      if (!selectedColor || !selectedSize) return null;
      return variantRows.find(v => {
        const cs = splitColorSize(v.option_value || '');
        return cs.color === selectedColor && cs.size === selectedSize;
      }) || null;
    }
    if (!selectedSize) return null;
    return variantRows.find(v => v.option_value === selectedSize) || null;
  }, [variantRows, selectedColor, selectedSize, bothDims]);

  const sizeStockMap = useMemo(() => {
    if (!variantRows) return {};
    const map: Record<string, number> = {};
    if (bothDims && selectedColor) {
      for (const r of variantRows) {
        const cs = splitColorSize(r.option_value || '');
        if (cs.color === selectedColor && cs.size) {
          map[cs.size] = r.stock ?? 0; // null stock treated as 0 for UI
        }
      }
    } else {
      for (const r of variantRows) {
        map[r.option_value] = r.stock ?? 0; // null stock treated as 0 for UI
      }
    }
    return map;
  }, [variantRows, bothDims, selectedColor]);

  const colorImageMap = useMemo(() => {
    if (!variantRows || !bothDims) return {};
    const map: Record<string, string> = {};
    for (const color of colorOptions) {
      const variant = variantRows.find(v => {
        const cs = splitColorSize(v.option_value || '');
        return cs.color === color;
      });
      if (variant) {
        map[color] = product.images[0] || '';
      }
    }
    return map;
  }, [variantRows, bothDims, colorOptions, product.images]);

  const currentSizes = bothDims 
    ? (sizeOptionsByColor[selectedColor] || [])
    : singleDimOptions;

  const cjPid = (product as any)?.cj_product_id as string | undefined;
  const [quote, setQuote] = useState<{ retailSar: number; shippingSar: number; options: any[] } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!cjPid || !selectedVariant?.cj_sku) { 
        setQuote(null); 
        setQuoteLoading(false);
        return; 
      }
      setQuoteLoading(true);
      try {
        const res = await fetch('/api/cj/pricing/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid: cjPid, sku: selectedVariant.cj_sku, countryCode: 'SA', quantity: 1 }),
          cache: 'no-store',
        });
        const j = await res.json();
        if (cancelled) return;
        if (res.ok && j && j.ok) setQuote({ retailSar: j.retailSar, shippingSar: j.shippingSar, options: j.options || [] });
        else setQuote(null);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [cjPid, selectedVariant?.cj_sku]);

  const isOutOfStock = (product.stock ?? 0) <= 0;
  const variantOutOfStock = selectedVariant ? (selectedVariant.stock ?? 0) <= 0 : false;
  const addToCartDisabled = isOutOfStock || (hasRows && (selectedVariant ? variantOutOfStock : true));

  const currentPrice = selectedVariant?.price ?? product.price;

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="w-full lg:w-[55%] xl:w-[60%]">
          <MediaGallery 
            images={product.images} 
            title={product.title}
            videoUrl={(product as any).video_url}
          />
        </div>

        <div className="w-full lg:w-[45%] xl:w-[40%] space-y-6">
          <DetailHeader
            title={product.title}
            productCode={product.product_code}
            rating={product.rating}
            reviewCount={0}
          />

          <PriceBlock
            price={currentPrice}
            isAvailable={!isOutOfStock && !variantOutOfStock}
          />

          {bothDims && colorOptions.length > 0 && (
            <ColorSelector
              colors={colorOptions}
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              colorImages={colorImageMap}
              hotColors={colorOptions.slice(0, 2)}
            />
          )}

          {currentSizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Size:</span>
                  <span className="text-sm text-muted-foreground">{selectedSize}</span>
                </div>
                <SizeGuideModal />
              </div>
              <div className="flex flex-wrap gap-2">
                {currentSizes.map((size) => {
                  const isSelected = size === selectedSize;
                  const stock = sizeStockMap[size] ?? 0;
                  const isOutOfStockSize = stock <= 0;
                  const isLowStock = stock > 0 && stock <= 3;

                  return (
                    <button
                      key={size}
                      onClick={() => !isOutOfStockSize && setSelectedSize(size)}
                      disabled={isOutOfStockSize}
                      className={cn(
                        "relative min-w-[48px] px-4 py-2 rounded-md text-sm font-medium transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isOutOfStockSize
                            ? "bg-muted text-muted-foreground cursor-not-allowed line-through"
                            : "bg-card border border-border hover:border-primary text-foreground"
                      )}
                    >
                      {size}
                      {isLowStock && !isSelected && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
              {sizeStockMap[selectedSize] !== undefined && sizeStockMap[selectedSize] > 0 && sizeStockMap[selectedSize] <= 3 && (
                <p className="text-sm text-amber-600">
                  Only {sizeStockMap[selectedSize]} left!
                </p>
              )}
            </div>
          )}

          <div className="hidden md:block">
            <ActionPanel
              productId={product.id}
              productSlug={product.slug}
              selectedOptions={selectedOptions}
              disabled={addToCartDisabled}
            />
          </div>

          <ShippingInfo 
            cjPid={cjPid}
            quote={quote}
            quoteLoading={quoteLoading}
            selectedVariant={selectedVariant}
            product={product}
          />

          {product.description && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Product Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {children}
        </div>
      </div>

      <ProductTabs
        description={product.description}
        highlights={[
          "Perfect for Spring and Summer seasons",
          "Made with chiffon and polyester for a luxurious feel",
          "Features short sleeves for added comfort",
          "Designed for women, with an elegant style",
        ]}
        sellingPoints={[
          `${product.category || "Fashion"} Type: ${product.title?.split(' ').slice(0, 3).join(' ')}`,
          "Gender: Women's",
          `Style: ${(product as any).style || "Elegant"}`,
        ]}
        specifications={{
          "Category": product.category || "Fashion",
          "Gender": "Women's",
          "Style": (product as any).style || "Elegant",
          "Fit Type": "Regular Fit",
          "Season": "Summer, Spring",
        }}
      />

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 safe-area-inset-bottom">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="shrink-0">
            <div className="text-xs text-muted-foreground">Price</div>
            <div className="text-lg font-bold text-primary">{formatCurrency(currentPrice)}</div>
          </div>
          <div className="flex-1">
            <AddToCart 
              productId={product.id} 
              productSlug={product.slug as any} 
              selectedOptions={selectedOptions} 
              disabled={addToCartDisabled} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
