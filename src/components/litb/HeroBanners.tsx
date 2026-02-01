"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

interface CuratedProduct {
  id: number;
  name: string;
  image: string;
  price: number;
  slug: string;
}

const LEFT_BANNERS = [
  { title: "Dress it Up", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=150&fit=crop", href: "/category/dresses", bg: "from-pink-500 to-purple-600" },
  { title: "Cheeky Chuckles", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=150&fit=crop", href: "/category/funny", bg: "from-blue-400 to-blue-600" },
  { title: "Make it at Home", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=150&fit=crop", href: "/category/home-garden-furniture", bg: "from-amber-400 to-orange-500" },
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
  const [curatedProducts, setCuratedProducts] = useState<CuratedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CENTER_BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchCuratedProducts() {
      try {
        const res = await fetch("/api/products/curated?limit=4");
        const data = await res.json();
        if (data.ok && data.products && data.products.length > 0) {
          setCuratedProducts(data.products.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch curated products:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCuratedProducts();
  }, []);

  return (
    <section className="relative py-4">
      <div className="absolute inset-0 bg-gradient-to-b from-[#e31e24] via-[#e31e24] to-transparent h-[60px] pointer-events-none -z-10" />
      <div className="absolute inset-x-0 top-[60px] h-[200px] bg-gradient-to-b from-[#dc4c50] via-[#f5a0a3] to-white pointer-events-none -z-10" />
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

          <div 
            className="relative h-[280px] lg:h-[316px] rounded-lg overflow-hidden select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {CENTER_BANNERS.map((banner, i) => (
              <Link
                key={i}
                href={banner.href as Route}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  i === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                draggable={false}
              >
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover pointer-events-none"
                  priority={i === 0}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent pointer-events-none" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white pointer-events-none">
                  <h2 className="text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                    {banner.title}
                  </h2>
                  <p className="text-lg mb-4 drop-shadow">{banner.subtitle}</p>
                  <span className="bg-white/90 text-gray-800 px-6 py-2 rounded font-medium hover:bg-white transition pointer-events-auto">
                    {banner.cta}
                  </span>
                </div>
              </Link>
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
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

          <div className="hidden lg:block relative rounded-lg overflow-hidden bg-gradient-to-br from-pink-100 to-pink-50 p-3 h-[316px]">
            <div className="text-center h-full flex flex-col">
              <p className="text-gray-600 text-xs mb-0.5">CURATED FOR YOU</p>
              <p className="text-xl font-bold text-gray-800 leading-tight">
                ITEMS UP TO <span className="text-[#e31e24]">60%</span>OFF
              </p>
              <p className="text-gray-500 text-xs mb-2">JUST A TAP AWAY</p>
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-1.5 shadow-sm animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  ))
                ) : curatedProducts.length > 0 ? (
                  curatedProducts.map((product) => (
                    <Link 
                      href={`/product/${product.slug}`} 
                      key={product.id} 
                      className="bg-white rounded-lg p-1.5 shadow-sm hover:shadow-md transition group"
                    >
                      <div className="aspect-square bg-gray-100 rounded mb-1 overflow-hidden relative">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="text-xs text-gray-900 font-medium">From ${product.price.toFixed(2)}</p>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-2 flex items-center justify-center text-gray-400 text-sm">
                    No products available
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-center">
                <div className="w-16 h-16 bg-white p-1 rounded shadow-sm">
                  <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center relative overflow-hidden">
                    <svg viewBox="0 0 100 100" className="w-full h-full p-1">
                      <rect fill="white" x="0" y="0" width="100" height="100"/>
                      <g fill="black">
                        <rect x="10" y="10" width="8" height="8"/>
                        <rect x="18" y="10" width="8" height="8"/>
                        <rect x="26" y="10" width="8" height="8"/>
                        <rect x="34" y="10" width="8" height="8"/>
                        <rect x="42" y="10" width="8" height="8"/>
                        <rect x="50" y="10" width="8" height="8"/>
                        <rect x="58" y="10" width="8" height="8"/>
                        <rect x="10" y="18" width="8" height="8"/>
                        <rect x="58" y="18" width="8" height="8"/>
                        <rect x="10" y="26" width="8" height="8"/>
                        <rect x="26" y="26" width="8" height="8"/>
                        <rect x="34" y="26" width="8" height="8"/>
                        <rect x="42" y="26" width="8" height="8"/>
                        <rect x="58" y="26" width="8" height="8"/>
                        <rect x="10" y="34" width="8" height="8"/>
                        <rect x="26" y="34" width="8" height="8"/>
                        <rect x="34" y="34" width="8" height="8"/>
                        <rect x="42" y="34" width="8" height="8"/>
                        <rect x="58" y="34" width="8" height="8"/>
                        <rect x="10" y="42" width="8" height="8"/>
                        <rect x="26" y="42" width="8" height="8"/>
                        <rect x="34" y="42" width="8" height="8"/>
                        <rect x="42" y="42" width="8" height="8"/>
                        <rect x="58" y="42" width="8" height="8"/>
                        <rect x="10" y="50" width="8" height="8"/>
                        <rect x="58" y="50" width="8" height="8"/>
                        <rect x="10" y="58" width="8" height="8"/>
                        <rect x="18" y="58" width="8" height="8"/>
                        <rect x="26" y="58" width="8" height="8"/>
                        <rect x="34" y="58" width="8" height="8"/>
                        <rect x="42" y="58" width="8" height="8"/>
                        <rect x="50" y="58" width="8" height="8"/>
                        <rect x="58" y="58" width="8" height="8"/>
                        <rect x="74" y="10" width="8" height="8"/>
                        <rect x="82" y="10" width="8" height="8"/>
                        <rect x="74" y="18" width="8" height="8"/>
                        <rect x="82" y="18" width="8" height="8"/>
                        <rect x="74" y="34" width="8" height="8"/>
                        <rect x="82" y="34" width="8" height="8"/>
                        <rect x="74" y="42" width="8" height="8"/>
                        <rect x="74" y="50" width="8" height="8"/>
                        <rect x="82" y="50" width="8" height="8"/>
                        <rect x="10" y="74" width="8" height="8"/>
                        <rect x="18" y="74" width="8" height="8"/>
                        <rect x="26" y="74" width="8" height="8"/>
                        <rect x="10" y="82" width="8" height="8"/>
                        <rect x="26" y="82" width="8" height="8"/>
                        <rect x="42" y="74" width="8" height="8"/>
                        <rect x="50" y="74" width="8" height="8"/>
                        <rect x="58" y="74" width="8" height="8"/>
                        <rect x="42" y="82" width="8" height="8"/>
                        <rect x="58" y="82" width="8" height="8"/>
                        <rect x="74" y="74" width="8" height="8"/>
                        <rect x="82" y="74" width="8" height="8"/>
                        <rect x="74" y="82" width="8" height="8"/>
                        <rect x="82" y="82" width="8" height="8"/>
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Scan to download app</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
