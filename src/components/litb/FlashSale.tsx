"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

const FLASH_PRODUCTS = [
  { id: 1, name: "Men's Hoodie Pullover", price: 7.39, originalPrice: 18.99, discount: 61, rating: 4.7, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop" },
  { id: 2, name: "Women's Thermal Pants", price: 6.65, originalPrice: 15.99, discount: 58, rating: 4.8, image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=200&h=200&fit=crop" },
  { id: 3, name: "Turtleneck Sweater", price: 9.61, originalPrice: 28.99, discount: 67, rating: 4.8, image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop" },
  { id: 4, name: "Winter Face Mask", price: 3.69, originalPrice: 12.99, discount: 72, rating: 4.9, image: "https://images.unsplash.com/photo-1598928506311-c55ez361a58?w=200&h=200&fit=crop" },
  { id: 5, name: "Heated Jacket", price: 5.17, originalPrice: 10.99, discount: 53, rating: 4.6, image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop" },
  { id: 6, name: "Casual Shoes", price: 10.35, originalPrice: 36.99, discount: 72, rating: 4.8, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop" },
  { id: 7, name: "Sports Watch", price: 12.99, originalPrice: 45.99, discount: 72, rating: 4.9, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop" },
  { id: 8, name: "Wireless Earbuds", price: 8.49, originalPrice: 29.99, discount: 72, rating: 4.7, image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop" },
];

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

export default function FlashSale() {
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
            {FLASH_PRODUCTS.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="shrink-0 w-[150px] group/card"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover/card:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[#e31e24] font-bold">
                      <span className="text-xs">⚡</span>${product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 line-through">${product.originalPrice.toFixed(2)}</span>
                    <span className="text-xs text-[#e31e24]">-{product.discount}%</span>
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
