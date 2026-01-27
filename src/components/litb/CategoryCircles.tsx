"use client";

import Link from "next/link";
import type { Route } from "next";

interface CategoryItemType {
  label: string;
  image: string;
  href: string;
  highlight?: boolean;
  slug: string;
}

const CATEGORY_CIRCLES = [
  { 
    name: "SALE", 
    slug: "sale", 
    image: "",
    highlight: true 
  },
  { 
    name: "Women's Clothing", 
    slug: "womens-clothing", 
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop"
  },
  { 
    name: "Pet Supplies", 
    slug: "pet-supplies", 
    image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=200&h=200&fit=crop"
  },
  { 
    name: "Home Garden Furn...", 
    slug: "home-garden-furniture", 
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop"
  },
  { 
    name: "Health Beauty Hair", 
    slug: "health-beauty-hair", 
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop"
  },
  { 
    name: "Jewelry Watches", 
    slug: "jewelry-watches", 
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop"
  },
  { 
    name: "Men's Clothing", 
    slug: "mens-clothing", 
    image: "https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=200&h=200&fit=crop"
  },
  { 
    name: "Bags & Shoes", 
    slug: "bags-shoes", 
    image: "https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?w=200&h=200&fit=crop"
  },
  { 
    name: "Toys, Kids & Babies", 
    slug: "toys-kids-babies", 
    image: "https://images.unsplash.com/photo-1536846511313-4b07b637bff9?w=200&h=200&fit=crop"
  },
  { 
    name: "Sports & Outdoors", 
    slug: "sports-outdoors", 
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop"
  },
  { 
    name: "Consumer Electronics", 
    slug: "consumer-electronics", 
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop"
  },
  { 
    name: "Home Improvement", 
    slug: "home-improvement", 
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop"
  },
  { 
    name: "Automobiles Motorcycles", 
    slug: "automobiles-motorcycles", 
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop"
  },
  { 
    name: "Phones & Accessories", 
    slug: "phones-accessories", 
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop"
  },
  { 
    name: "Computer & Office", 
    slug: "computer-office", 
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop"
  },
];

function CategoryItem({ item }: { item: CategoryItemType }) {
  return (
    <Link
      href={item.href as Route}
      className="flex flex-col items-center gap-2 group flex-shrink-0"
    >
      <div
        className={`relative w-[110px] h-[110px] md:w-[140px] md:h-[140px] rounded-full overflow-hidden transition-transform group-hover:scale-105 ${
          item.highlight ? "border-[3px] border-[#e31e24]" : "border-2 border-gray-100"
        }`}
      >
        {item.highlight ? (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center">
            <span className="text-white font-bold text-2xl">SALE</span>
          </div>
        ) : (
          <img
            src={item.image}
            alt={item.label}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <span className={`text-xs text-center max-w-[120px] truncate ${
        item.highlight ? "font-medium text-[#e31e24]" : "text-gray-700"
      }`}>
        {item.label}
      </span>
    </Link>
  );
}

export default function CategoryCircles() {
  const categories: CategoryItemType[] = CATEGORY_CIRCLES.map(cat => ({
    label: cat.name,
    image: cat.image,
    href: cat.highlight ? "/sale" : `/category/${cat.slug}`,
    highlight: cat.highlight,
    slug: cat.slug,
  }));

  const row1 = categories.slice(0, 8);
  const row2 = categories.slice(8, 15);

  return (
    <section className="py-6 bg-white">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex justify-between gap-4 overflow-x-auto hide-scrollbar pb-3">
          {row1.map((item, i) => (
            <CategoryItem key={item.slug || i} item={item} />
          ))}
        </div>
        {row2.length > 0 && (
          <div className="flex justify-between gap-4 overflow-x-auto hide-scrollbar pt-3">
            {row2.map((item, i) => (
              <CategoryItem key={item.slug || i} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
