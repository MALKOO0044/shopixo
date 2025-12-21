"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";

const CATEGORIES_ROW_1 = [
  { label: "SALE", image: "https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=200&h=200&fit=crop", href: "/sale", highlight: true },
  { label: "Men", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", href: "/category/men" },
  { label: "Women", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop", href: "/category/women" },
  { label: "Home&Garden", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop", href: "/category/home" },
  { label: "Lighting", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop", href: "/category/lighting" },
  { label: "Toys & Hobbies", image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop", href: "/category/toys" },
  { label: "Carnival Costumes", image: "https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=200&h=200&fit=crop", href: "/category/costumes" },
];

const CATEGORIES_ROW_2 = [
  { label: "Formal Men", image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop", href: "/category/formal-men" },
  { label: "Formal Women", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&h=200&fit=crop", href: "/category/formal-women" },
  { label: "Kids", image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=200&h=200&fit=crop", href: "/category/kids" },
  { label: "Sports", image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop", href: "/category/sports" },
  { label: "Gadget Garage", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop", href: "/category/gadgets" },
  { label: "New Arrivals", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop", href: "/new-arrivals", gradient: "from-blue-500 to-purple-600" },
  { label: "Top Picks", image: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop", href: "/top-picks", gradient: "from-orange-500 to-red-500" },
];

interface CategoryItemType {
  label: string;
  image: string;
  href: string;
  highlight?: boolean;
  gradient?: string;
}

function CategoryItem({ item }: { item: CategoryItemType }) {
  return (
    <Link
      href={item.href as Route}
      className="flex flex-col items-center gap-2 group"
    >
      <div
        className={`relative w-[110px] h-[110px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden transition-transform group-hover:scale-105 ${
          item.highlight ? "border-[3px] border-[#e31e24]" : "border-2 border-gray-100"
        }`}
      >
        {item.gradient ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
            <span className="text-white font-bold text-sm text-center px-2">{item.label}</span>
          </div>
        ) : item.highlight ? (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">SALE</span>
          </div>
        ) : (
          <Image
            src={item.image}
            alt={item.label}
            fill
            sizes="140px"
            className="object-cover"
          />
        )}
      </div>
      <span className={`text-xs text-center transition-colors ${
        item.highlight ? "font-medium text-[#e31e24]" : "text-gray-700 group-hover:text-[#e31e24]"
      }`}>
        {item.label}
      </span>
    </Link>
  );
}

export default function CategoryCircles() {
  return (
    <section className="py-6 bg-white">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex justify-between overflow-x-auto hide-scrollbar pb-3">
          {CATEGORIES_ROW_1.map((item, i) => (
            <CategoryItem key={i} item={item} />
          ))}
        </div>
        <div className="flex justify-between overflow-x-auto hide-scrollbar pt-3">
          {CATEGORIES_ROW_2.map((item, i) => (
            <CategoryItem key={i} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
