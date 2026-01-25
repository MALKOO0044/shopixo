"use client";

import Image from "next/image";
import Link from "next/link";

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
              <Image
                src={product.image}
                alt=""
                fill
                sizes="96px"
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="text-center">
              <span className="font-bold text-red-600">${product.price.toFixed(2)}</span>
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
