"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const LEFT_BANNERS = [
  { title: "Dress it Up", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=150&fit=crop", href: "/category/dresses", bg: "from-pink-500 to-purple-600" },
  { title: "Cheeky Chuckles", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=150&fit=crop", href: "/category/funny", bg: "from-blue-400 to-blue-600" },
  { title: "Make it at Home", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=150&fit=crop", href: "/category/home", bg: "from-amber-400 to-orange-500" },
];

const CENTER_BANNERS = [
  {
    title: "NEW YEAR, NEW BETTER ME!",
    subtitle: "Shop the latest trends",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=400&fit=crop",
    href: "/new-arrivals",
    cta: "SHOP NOW >",
  },
  {
    title: "WINTER FASHION SALE",
    subtitle: "Up to 70% off",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=400&fit=crop",
    href: "/sale",
    cta: "SHOP NOW >",
  },
  {
    title: "TRENDING STYLES",
    subtitle: "New collection arrived",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=400&fit=crop",
    href: "/collections",
    cta: "EXPLORE >",
  },
];

export default function HeroBanners() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CENTER_BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#e31e24] via-[#e31e24] to-transparent h-[60px]" />
      <div className="absolute inset-x-0 top-[60px] h-[200px] bg-gradient-to-b from-[#dc4c50] via-[#f5a0a3] to-white" />
      <div className="relative max-w-[1320px] mx-auto px-2">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-3">
          <div className="hidden lg:flex flex-col gap-2">
            {LEFT_BANNERS.map((banner, i) => (
              <Link
                key={i}
                href={banner.href as Route}
                className="relative h-[100px] rounded-lg overflow-hidden group"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${banner.bg} opacity-90`} />
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  sizes="200px"
                  className="object-cover mix-blend-overlay"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-sm drop-shadow-lg">{banner.title}</span>
                </div>
              </Link>
            ))}
          </div>

          <div className="relative h-[280px] lg:h-[316px] rounded-lg overflow-hidden">
            {CENTER_BANNERS.map((banner, i) => (
              <Link
                key={i}
                href={banner.href as Route}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover"
                  priority={i === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                  <h2 className="text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                    {banner.title}
                  </h2>
                  <p className="text-lg mb-4 drop-shadow">{banner.subtitle}</p>
                  <span className="bg-white/90 text-gray-800 px-6 py-2 rounded font-medium hover:bg-white transition">
                    {banner.cta}
                  </span>
                </div>
              </Link>
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {CENTER_BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentSlide ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="hidden lg:block relative rounded-lg overflow-hidden bg-gradient-to-br from-pink-100 to-pink-50 p-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-1">CURATED FOR YOU</p>
              <p className="text-2xl font-bold text-gray-800 mb-1">
                ITEMS UP TO <span className="text-[#e31e24]">60%</span>OFF
              </p>
              <p className="text-gray-500 text-sm mb-3">JUST A TAP AWAY</p>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="aspect-square bg-gray-100 rounded mb-1" />
                    <p className="text-xs text-gray-500">From $9.99</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <div className="w-20 h-20 bg-white p-1 rounded">
                  <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                    QR Code
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

