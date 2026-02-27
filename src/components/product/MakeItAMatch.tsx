"use client";

import Link from "next/link";
import SmartImage from "@/components/smart-image";
import { enhanceProductImageUrl } from "@/lib/media/image-quality";

interface MatchProduct {
  id: number;
  slug: string;
  image: string;
  price: number;
  originalPrice?: number;
}

interface MakeItAMatchProps {
  products: MatchProduct[];
}

function safeImageUrl(img: string | undefined | null): string {
  if (!img) return '/placeholder.svg';
  const s = img.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return enhanceProductImageUrl(parsed[0], 'card');
      }
    } catch {}
  }
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) {
    return enhanceProductImageUrl(s, 'card');
  }
  return '/placeholder.svg';
}

export default function MakeItAMatch({ products }: MakeItAMatchProps) {
  if (products.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="font-bold text-lg mb-4">Make It A Match</h3>
      <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="shrink-0 group"
          >
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 mb-2">
              <SmartImage
                src={safeImageUrl(product.image)}
                alt=""
                fill
                quality={95}
                loading="lazy"
                sizes="96px"
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="text-center">
              <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-xs text-gray-400 line-through ml-1">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
