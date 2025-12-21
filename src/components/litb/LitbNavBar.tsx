"use client";

import Link from "next/link";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Route } from "next";

interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  children?: Category[];
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: "Women's Clothing", slug: "womens-clothing", parent_id: null, level: 1 },
  { id: 2, name: "Pet Supplies", slug: "pet-supplies", parent_id: null, level: 1 },
  { id: 3, name: "Home & Garden", slug: "home-garden-furniture", parent_id: null, level: 1 },
  { id: 4, name: "Health & Beauty", slug: "health-beauty-hair", parent_id: null, level: 1 },
  { id: 5, name: "Jewelry & Watches", slug: "jewelry-watches", parent_id: null, level: 1 },
  { id: 6, name: "Men's Clothing", slug: "mens-clothing", parent_id: null, level: 1 },
  { id: 7, name: "Bags & Shoes", slug: "bags-shoes", parent_id: null, level: 1 },
  { id: 8, name: "Toys & Kids", slug: "toys-kids-babies", parent_id: null, level: 1 },
  { id: 9, name: "Sports & Outdoors", slug: "sports-outdoors", parent_id: null, level: 1 },
  { id: 10, name: "Electronics", slug: "consumer-electronics", parent_id: null, level: 1 },
  { id: 11, name: "Home Improvement", slug: "home-improvement", parent_id: null, level: 1 },
  { id: 12, name: "Automobiles", slug: "automobiles-motorcycles", parent_id: null, level: 1 },
  { id: 13, name: "Phones & Accessories", slug: "phones-accessories", parent_id: null, level: 1 },
  { id: 14, name: "Computer & Office", slug: "computer-office", parent_id: null, level: 1 },
];

const QUICK_LINKS = [
  { label: "Flash Sale", href: "/flash-sale", highlight: true },
  { label: "Women", href: "/category/womens-clothing" },
  { label: "Men", href: "/category/mens-clothing" },
  { label: "Best Sellers", href: "/bestsellers" },
  { label: "Home Décor", href: "/category/home-garden-furniture" },
  { label: "Toys&Hobbies", href: "/category/toys-kids-babies" },
  { label: "Shoes&Accessories", href: "/category/bags-shoes" },
  { label: "Christmas🎄", href: "/category/festive-party-supplies", special: true },
  { label: "Flirty Nights", href: "/category/weddings-events" },
  { label: "Original Graphic Apparel", href: "/category/womens-tops-sets" },
  { label: "Special Offer", href: "/sale" },
];

export default function LitbNavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?tree=true");
        const data = await res.json();
        if (data.ok && data.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hoveredCat = categories.find(c => c.id === hoveredCategory);

  return (
    <nav className="bg-white border-b relative z-40">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex items-center gap-6 h-[42px] overflow-x-auto hide-scrollbar">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 text-sm font-medium hover:text-[#e31e24] shrink-0"
            >
              <Menu className="h-4 w-4" />
              <span>Categories</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="fixed left-0 top-[90px] w-[220px] bg-white shadow-2xl border-r z-[9999] max-h-[calc(100vh-100px)] overflow-y-auto">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}` as Route}
                    className="flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 hover:bg-gray-50 hover:text-[#e31e24] transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>{cat.name}</span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-5">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href as Route}
                className={`text-sm whitespace-nowrap hover:text-[#e31e24] transition-colors shrink-0 ${
                  item.highlight ? "text-[#e31e24] font-medium" : ""
                } ${item.special ? "text-green-600" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
