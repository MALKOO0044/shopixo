"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const PROMO_BANNERS = [
  {
    title: "Back to Basics",
    image: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400&h=200&fit=crop",
    href: "/category/basics",
    icon: "🧥",
  },
  {
    title: "Flash into Sales",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop",
    href: "/sale",
    icon: "%",
    isOrange: true,
  },
  {
    title: "Take me to the Beach",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=200&fit=crop",
    href: "/category/beach",
    icon: "🏖️",
  },
];

export default function PromoBanners() {
  return (
    <section className="py-6 bg-gray-50">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROMO_BANNERS.map((banner, i) => (
            <Link
              key={i}
              href={banner.href as Route}
              className="relative h-[120px] rounded-lg overflow-hidden group"
            >
              <Image
                src={banner.image}
                alt={banner.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-white/40" />
              <div className="absolute inset-0 flex items-center px-6">
                <div className="flex items-center gap-3">
                  {banner.isOrange ? (
                    <span className="text-4xl font-bold text-orange-500">{banner.icon}</span>
                  ) : (
                    <span className="text-3xl">{banner.icon}</span>
                  )}
                  <span className="text-lg font-semibold text-gray-800">
                    {banner.title} <span className="text-gray-400">&gt;</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
