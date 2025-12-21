"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart } from "lucide-react";

const RECOMMENDED_PRODUCTS = [
  { id: 1, name: "Women's Midi Dress Sheath Dress Elegant Formal", price: 55.94, originalPrice: 75.04, rating: 5.0, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=400&fit=crop", badge: null },
  { id: 2, name: "Satin Floral Twist Jumpsuit", price: 8.87, originalPrice: 67.91, rating: 4.5, image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 3, name: "Women Long Sleeve Top", price: 4.43, originalPrice: null, rating: 5.0, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 4, name: "VINTATRE Women Kimono Robes", price: 8.13, originalPrice: 9.61, rating: 5.0, image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 5, name: "Men's Geometric Color Block Shirt", price: 8.13, originalPrice: 26.13, rating: 4.8, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 6, name: "Women's Mini Dress Sequin Dress", price: 30.64, originalPrice: 38.30, rating: 4.8, image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 7, name: "Women's Wedding Guest Dress Maxi", price: 8.87, originalPrice: 176.71, rating: 5.0, image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 8, name: "2pcs Funny Cartoon Car Headrest", price: 4.80, originalPrice: 8.97, rating: 4.9, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=400&fit=crop", badge: null },
  { id: 9, name: "Women's Long Dress Maxi Dress A Line", price: 8.87, originalPrice: 63.94, rating: 5.0, image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=300&h=400&fit=crop", badge: "SALE" },
  { id: 10, name: "Rolling Grill Basket - SUS304", price: 8.65, originalPrice: 16.43, rating: 4.9, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=400&fit=crop", badge: null },
];

export default function RecommendedProducts() {
  const [visibleCount, setVisibleCount] = useState(10);

  return (
    <section className="py-6 bg-white border-t">
      <div className="container">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Recommended for You</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {RECOMMENDED_PRODUCTS.slice(0, visibleCount).map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group bg-white rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[3/4] bg-gray-100">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
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

        {visibleCount < RECOMMENDED_PRODUCTS.length && (
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
