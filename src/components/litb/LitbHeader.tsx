"use client";

import Link from "next/link";
import { Heart, ShoppingCart, User, ChevronDown, Tag } from "lucide-react";
import AnimatedSearchBar from "./AnimatedSearchBar";
import { useState } from "react";
import type { Route } from "next";

export default function LitbHeader() {
  const [cartCount] = useState(3);

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex items-center justify-between h-[60px] gap-3">
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="text-2xl font-bold">
              <span className="text-gray-800">Shop</span>
              <span className="text-[#e31e24]">ixo</span>
            </span>
          </Link>

          <AnimatedSearchBar />

          <div className="hidden md:flex items-center gap-1 shrink-0">
            <Tag className="h-4 w-4 text-[#e31e24]" />
            <span className="text-xs text-[#e31e24] font-medium">APP Only! Get Up To 60% Off</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1 text-sm cursor-pointer hover:text-[#e31e24]">
              <span className="text-lg">🇺🇸</span>
              <span className="font-medium">EN</span>
              <span className="text-gray-400">|</span>
              <span className="font-medium">USD</span>
              <ChevronDown className="h-4 w-4" />
            </div>

            <Link href={"/account" as Route} className="hidden md:flex items-center gap-1 text-sm hover:text-[#e31e24]">
              <User className="h-5 w-5" />
              <span>Account</span>
            </Link>

            <Link href={"/wishlist" as Route} className="relative hover:text-[#e31e24]">
              <Heart className="h-5 w-5" />
            </Link>

            <Link href="/cart" className="relative flex items-center gap-1 text-[#e31e24] font-medium">
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden md:inline">CART</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 md:static md:ml-0 bg-[#e31e24] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
