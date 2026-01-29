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

export default function SmartImage({ src, alt, fill, className, loading, ...rest }: SmartImageProps) {
  const canUseNext = isAllowedNextImage(src);
  if (canUseNext) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          className={className}
          loading={loading as any}
          sizes={(rest as any).sizes || "(max-width: 768px) 100vw, 33vw"}
          priority={(rest as any).priority}
          quality={(rest as any).quality}
        />
      );
    }
    const width = (rest as any).width ?? 800;
    const height = (rest as any).height ?? 600;
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={loading as any}
        priority={(rest as any).priority}
        quality={(rest as any).quality}
      />
    );
  }
  return <img src={src} alt={alt} className={className} loading={loading as any} {...(rest as any)} />;
}
