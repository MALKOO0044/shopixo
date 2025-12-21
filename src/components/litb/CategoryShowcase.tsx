"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const SHOWCASES = [
  {
    title: "Men's Sweatshirts",
    subtitle: "Mens",
    image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=600&h=400&fit=crop",
    href: "/category/mens-sweatshirts",
  },
  {
    title: "Women's Tops",
    subtitle: "Tops",
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=400&fit=crop",
    href: "/category/womens-tops",
  },
];

export default function CategoryShowcase() {
  return (
    <section className="py-6 bg-white">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHOWCASES.map((showcase, i) => (
            <Link
              key={i}
              href={showcase.href as Route}
              className="relative h-[250px] rounded-lg overflow-hidden group"
            >
              <Image
                src={showcase.image}
                alt={showcase.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <p className="text-sm italic opacity-80">{showcase.subtitle}</p>
                <h3 className="text-2xl font-bold">{showcase.title}</h3>
                <button className="mt-3 bg-white/20 backdrop-blur-sm border border-white/40 text-white px-6 py-2 rounded hover:bg-white/30 transition">
                  SHOP NOW
                </button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
