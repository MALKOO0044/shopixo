"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart } from "lucide-react";
import type { HomepageProduct } from "@/lib/homepage-products";

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
      <div className="container">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recommended for You</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.slice(0, visibleCount).map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.slug || product.id}`}
              className="group bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[3/4] bg-gray-100">
                <Image
                  src={product.image}
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                >
                  <ShoppingCart className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-700 line-clamp-2 mb-2 group-hover:text-[#e31e24]">
                  {product.name}
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[#e31e24] font-bold">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-xs text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  ))}
                  <span className="text-xs text-gray-500">{product.rating}</span>
                </div>
              </div>
            </Link>
          ))}
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
