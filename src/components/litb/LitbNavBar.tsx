"use client";

import Link from "next/link";
import { Menu, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { Route } from "next";

const NAV_ITEMS = [
  { label: "Flash Sale", href: "/flash-sale", highlight: true },
  { label: "Women", href: "/category/women" },
  { label: "Men", href: "/category/men" },
  { label: "Best Sellers", href: "/bestsellers" },
  { label: "Home Décor", href: "/category/home-decor" },
  { label: "Toys&Hobbies", href: "/category/toys" },
  { label: "Shoes&Accessories", href: "/category/shoes" },
  { label: "Christmas🎄", href: "/category/christmas", special: true },
  { label: "Flirty Nights", href: "/category/party" },
  { label: "Original Graphic Apparel", href: "/category/graphic-apparel" },
  { label: "Special Offer", href: "/special-offer" },
];

export default function LitbNavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center gap-6 h-[42px] overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 text-sm font-medium hover:text-[#e31e24] shrink-0"
          >
            <Menu className="h-4 w-4" />
            <span>Categories</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-5">
            {NAV_ITEMS.map((item) => (
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
