"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Route } from "next";

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  image: string;
  badge?: string;
}

interface ProductCarouselProps {
  title: string;
  products: Product[];
  viewAllHref?: string;
}

export default function ProductCarousel({ title, products, viewAllHref }: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  return (
    <section className="py-6 bg-white border-t">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          {viewAllHref && (
            <Link href={viewAllHref as Route} className="text-sm text-gray-500 hover:text-[#e31e24] flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto hide-scrollbar scroll-smooth"
          >
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}` as Route}
                className="shrink-0 w-[160px] group/card"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover/card:scale-105 transition-transform"
                  />
                  {product.badge && (
                    <span className="absolute top-2 left-2 bg-[#e31e24] text-white text-xs px-2 py-0.5 rounded">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-700 line-clamp-2 group-hover/card:text-[#e31e24]">
                    {product.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#e31e24] font-bold">${product.price.toFixed(2)}</span>
                    {product.originalPrice && (
                      <span className="text-xs text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < Math.floor(product.rating!) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                      <span className="text-xs text-gray-500">{product.rating}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
