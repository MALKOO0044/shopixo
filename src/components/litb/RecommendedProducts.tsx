"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { normalizeDisplayedRating } from "@/lib/rating/engine";
import type { HomepageProduct } from "@/lib/homepage-products";

function safeImageUrl(img: string | undefined | null): string {
  if (!img) return '/placeholder-product.png';
  const s = img.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0];
      }
    } catch {}
  }
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) {
    return s;
  }
  return '/placeholder-product.png';
}

interface RecommendedProductsProps {
  products: HomepageProduct[];
}

export default function RecommendedProducts({ products }: RecommendedProductsProps) {
  const [visibleCount, setVisibleCount] = useState(10);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-6 bg-white border-t">
      <div className="max-w-[1320px] mx-auto px-2">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recommended for You</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
          {products.slice(0, visibleCount).map((product) => {
            const rating = normalizeDisplayedRating(product.displayed_rating);
            return (
              <Link
                key={product.id}
                href={`/product/${product.slug || product.id}`}
                className="group bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[3/4] bg-gray-100">
                  <Image
                    src={safeImageUrl(product.image)}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  {product.badge && (
                    <span className="absolute top-2 left-2 bg-[#e31e24] text-white text-xs px-2 py-0.5 rounded">
                      {product.badge}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-center py-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    QUICK SHOP
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {product.name}
                  </p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-gray-900 font-bold">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    ))}
                    <span className="text-xs text-gray-500">{rating.toFixed(1)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {visibleCount < products.length && (
          <div className="text-center mt-6">
            <button
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-8 py-3 border-2 border-gray-300 rounded text-gray-600 font-medium hover:border-[#e31e24] hover:text-[#e31e24] transition"
            >
              VIEW MORE
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
