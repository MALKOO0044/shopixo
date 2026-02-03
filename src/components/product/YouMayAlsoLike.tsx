"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

interface Product {
  id: number;
  slug: string;
  title: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating: number;
  badge?: string;
}

interface YouMayAlsoLikeProps {
  products: Product[];
  title?: string;
}

export default function YouMayAlsoLike({ products, title = "You May Also Like" }: YouMayAlsoLikeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth pb-2"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.slug}`}
            className="shrink-0 w-[180px] group"
          >
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2">
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="180px"
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
            <h4 className="text-sm text-gray-700 line-clamp-2">
              {product.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-bold text-gray-900">${product.price.toFixed(2)}</span>
              {product.originalPrice && (
                <span className="text-xs text-gray-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(((product as any).displayed_rating ?? 0) as number)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-500">{(((product as any).displayed_rating ?? 0) as number).toFixed(1)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
