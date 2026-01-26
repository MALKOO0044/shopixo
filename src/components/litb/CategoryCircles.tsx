"use client";

import Link from "next/link";
import type { Route } from "next";
<<<<<<< HEAD
=======
import { useEffect, useState } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  image_url: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
}

const CATEGORY_IMAGES: Record<string, string> = {
  "womens-clothing": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
  "pet-supplies": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop",
  "home-garden-furniture": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
  "health-beauty-hair": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
  "jewelry-watches": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop",
  "mens-clothing": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  "bags-shoes": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop",
  "toys-kids-babies": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop",
  "sports-outdoors": "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200&h=200&fit=crop",
  "consumer-electronics": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&h=200&fit=crop",
  "home-improvement": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop",
  "automobiles-motorcycles": "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=200&h=200&fit=crop",
  "phones-accessories": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop",
  "computer-office": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop",
};

const FALLBACK_CATEGORIES = [
  { name: "SALE", slug: "sale", highlight: true },
  { name: "Women's Clothing", slug: "womens-clothing" },
  { name: "Men's Clothing", slug: "mens-clothing" },
  { name: "Jewelry & Watches", slug: "jewelry-watches" },
  { name: "Bags & Shoes", slug: "bags-shoes" },
  { name: "Home Decor", slug: "home-garden-furniture" },
  { name: "Health & Beauty", slug: "health-beauty-hair" },
  { name: "Electronics", slug: "consumer-electronics" },
  { name: "Pet Supplies", slug: "pet-supplies" },
  { name: "Toys & Kids", slug: "toys-kids-babies" },
  { name: "Sports", slug: "sports-outdoors" },
  { name: "Phones", slug: "phones-accessories" },
  { name: "Computer", slug: "computer-office" },
  { name: "Home Improvement", slug: "home-improvement" },
];
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

interface CategoryItemType {
  label: string;
  image: string;
  href: string;
  highlight?: boolean;
<<<<<<< HEAD
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

=======
  slug?: string;
}

>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
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
<<<<<<< HEAD
      <span className={`text-xs text-center max-w-[120px] truncate ${
        item.highlight ? "font-medium text-[#e31e24]" : "text-gray-700"
=======
      <span className={`text-xs text-center transition-colors max-w-[120px] truncate ${
        item.highlight ? "font-medium text-[#e31e24]" : "text-gray-700 group-hover:text-[#e31e24]"
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
      }`}>
        {item.label}
      </span>
    </Link>
  );
}

export default function CategoryCircles() {
<<<<<<< HEAD
  const categories: CategoryItemType[] = CATEGORY_CIRCLES.map(cat => ({
    label: cat.name,
    image: cat.image,
    href: cat.highlight ? "/sale" : `/category/${cat.slug}`,
    highlight: cat.highlight,
    slug: cat.slug,
  }));

  const row1 = categories.slice(0, 8);
  const row2 = categories.slice(8, 15);
=======
  const [categories, setCategories] = useState<CategoryItemType[]>(() => {
    return FALLBACK_CATEGORIES.map(cat => ({
      label: cat.name,
      image: CATEGORY_IMAGES[cat.slug] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop",
      href: cat.highlight ? "/sale" : `/category/${cat.slug}`,
      highlight: cat.highlight,
      slug: cat.slug,
    }));
  });

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?level=1");
        const data = await res.json();
        if (data.ok && data.categories && data.categories.length > 0) {
          const fetchedItems: CategoryItemType[] = [
            { label: "SALE", image: "", href: "/sale", highlight: true, slug: "sale" },
            ...data.categories.map((cat: Category) => ({
              label: cat.name.replace(/[,&]/g, " ").replace(/\s+/g, " ").trim(),
              image: cat.image_url || CATEGORY_IMAGES[cat.slug] || "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop",
              href: `/category/${cat.slug}`,
              slug: cat.slug,
            })),
          ];
          setCategories(fetchedItems);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  const row1 = categories.slice(0, 7);
  const row2 = categories.slice(7, 15);
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

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
