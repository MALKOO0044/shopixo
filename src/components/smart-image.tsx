import Image, { ImageProps } from "next/image";
import React from "react";

export type SmartImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> &
  Omit<ImageProps, "src" | "alt"> & {
    src: string;
    alt: string;
    fill?: boolean;
  };

function isAllowedNextImage(src: string): boolean {
  if (!src) return false;
  const s = src.trim();
  if (s.startsWith("/")) return true; // local public assets
  if (s.startsWith("data:")) return false; // let <img> handle data URLs
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (host === "res.cloudinary.com") return true;
    if (host.endsWith(".supabase.co")) return true;
    if (host.endsWith(".supabase.in")) return true;
    // Allow CJ and common Alibaba CDNs so next/image can optimize them
    if (host === 'cjdropshipping.com' || host.endsWith('.cjdropshipping.com')) return true;
    if (host.includes('alicdn.com') || host.includes('aliyuncs.com')) return true;
  } catch {
    // Non-URL strings (e.g., bucket/object); treat as not allowed for next/image
  }
  return false;
}

function normalizeUrl(src: string): string {
  try {
    if (!src) return src;
    if (src.startsWith('http://')) return 'https://' + src.slice('http://'.length);
    return src;
  } catch {
    return src;
  }
}

export function transformForCdn(src: string): string {
  try {
    let url = normalizeUrl(src);
    const UPSCALE_MODE = (process.env.NEXT_PUBLIC_IMAGE_UPSCALE_MODE || 'none').toLowerCase();
    const PROXY_TPL = process.env.NEXT_PUBLIC_IMAGE_PROXY_TEMPLATE || '';
    const TARGET_W = Math.max(512, Math.min(8192, parseInt(process.env.NEXT_PUBLIC_IMAGE_TARGET_WIDTH || '7680', 10) || 7680));

    if (typeof url === 'string' && url.includes('res.cloudinary.com') && url.includes('/image/')) {
      const isUpload = url.includes('/image/upload/');
      const isFetch = url.includes('/image/fetch/');
      const marker = isUpload ? '/image/upload/' : (isFetch ? '/image/fetch/' : null);
      if (!marker) return url;
      const idx = url.indexOf(marker);
      const after = url.slice(idx + marker.length);
      const hasTransforms = after && !after.startsWith('v');
      if (hasTransforms) return url; // respect existing transforms
      const inject = `w_${TARGET_W},c_fit,dpr_2,e_sharpen,f_auto,q_auto/`;
      return url.replace(marker, marker + inject);
    }

    if (UPSCALE_MODE === 'proxy' && PROXY_TPL && /^https?:\/\//i.test(url)) {
      const encoded = encodeURIComponent(url);
      return PROXY_TPL.replace('{url}', encoded).replace('{w}', String(TARGET_W));
    }

    return url;
  } catch {
    return src;
  }
}

export default function SmartImage({ src, alt, fill, className, loading, ...rest }: SmartImageProps) {
  const transformed = transformForCdn(src);
  const canUseNext = isAllowedNextImage(transformed);
  const isCloudinary = (() => {
    try { return new URL(transformed).hostname.toLowerCase() === 'res.cloudinary.com'; } catch { return false; }
  })();
  if (canUseNext) {
    if (fill) {
      return (
        <Image
          src={transformed}
          alt={alt}
          fill
          className={className}
          loading={loading as any}
          sizes={(rest as any).sizes || "(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 800px"}
          priority={(rest as any).priority}
          quality={(rest as any).quality}
          unoptimized={isCloudinary}
        />
      );
    }
    const width = (rest as any).width ?? 800;
    const height = (rest as any).height ?? 600;
    return (
      <Image
        src={transformed}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading as any}
        priority={(rest as any).priority}
        quality={(rest as any).quality}
        unoptimized={isCloudinary}
      />
    );
  }
  return <img src={transformed} alt={alt} className={className} loading={loading as any} {...(rest as any)} />;
}
