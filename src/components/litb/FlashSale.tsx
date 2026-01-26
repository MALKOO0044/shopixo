"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { HomepageProduct } from "@/lib/homepage-products";

<<<<<<< HEAD
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

=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
interface FlashSaleProps {
  products: HomepageProduct[];
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 43, seconds: 34 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-600 text-sm">Ends in</span>
      <span className="bg-[#e31e24] text-white px-2 py-0.5 rounded text-sm font-bold">{pad(timeLeft.hours)}</span>
      <span className="text-[#e31e24] font-bold">:</span>
      <span className="bg-[#e31e24] text-white px-2 py-0.5 rounded text-sm font-bold">{pad(timeLeft.minutes)}</span>
      <span className="text-[#e31e24] font-bold">:</span>
      <span className="bg-[#e31e24] text-white px-2 py-0.5 rounded text-sm font-bold">{pad(timeLeft.seconds)}</span>
    </div>
  );
}

export default function FlashSale({ products }: FlashSaleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-6 bg-white border-t">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#e31e24] flex items-center gap-1">
              ⚡ FLASH SALE
              <ChevronRight className="h-5 w-5" />
            </span>
          </div>
          <CountdownTimer />
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
                href={`/product/${product.slug || product.id}`}
                className="shrink-0 w-[220px] group/card"
              >
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 mb-2">
                  <Image
<<<<<<< HEAD
                    src={safeImageUrl(product.image)}
=======
                    src={product.image}
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
                    alt={product.name}
                    fill
                    sizes="220px"
                    className="object-cover group-hover/card:scale-105 transition-transform"
                  />
                  {product.badge && (
                    <span className="absolute top-2 left-2 bg-[#e31e24] text-white text-xs px-1 py-0.5 rounded">
                      {product.badge}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-center py-2 text-sm font-medium opacity-0 group-hover/card:opacity-100 transition-opacity">
                    QUICK SHOP
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-700 line-clamp-2">{product.name}</p>
                  <div className="flex items-baseline gap-1">
<<<<<<< HEAD
                    <span className="text-gray-900 font-bold">
=======
                    <span className="text-[#e31e24] font-bold">
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
                      <span className="text-xs">⚡</span>${product.price.toFixed(2)}
                    </span>
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
