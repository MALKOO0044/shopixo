"use client";

import Link from "next/link";
import { Heart, ShoppingCart, User, ChevronDown } from "lucide-react";
import AnimatedSearchBar from "./AnimatedSearchBar";
import { useState } from "react";
import type { Route } from "next";

export default function LitbHeader() {
  const [cartCount] = useState(3);

  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center justify-between h-[60px] gap-4">
          <Link href="/" className="flex items-center gap-1 shrink-0">
            <span className="text-2xl font-bold">
              <span className="text-gray-800">Shop</span>
              <span className="text-[#e31e24]">ixo</span>
            </span>
          </Link>

          <AnimatedSearchBar />

          <div className="hidden md:flex items-center gap-2 text-xs text-[#e31e24] font-medium shrink-0">
            <span className="bg-[#fff3f3] px-2 py-1 rounded">APP Only! Get Up To 60% Off</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-1 text-sm cursor-pointer hover:text-[#e31e24] group relative">
              <div className="w-6 h-4 overflow-hidden rounded-sm shadow-sm">
                <div className="w-full h-full bg-gradient-to-b from-red-600 via-white to-blue-800 relative">
                  <div className="absolute top-0 left-0 w-2/5 h-[45%] bg-blue-800 flex items-center justify-center">
                    <span className="text-white text-[4px]">★★★</span>
                  </div>
                </div>
              </div>
              <span className="font-medium">EN</span>
              <span className="text-gray-400">|</span>
              <span className="font-medium">USD</span>
              <ChevronDown className="h-4 w-4" />
              <div className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-lg p-4 hidden group-hover:block min-w-[200px] z-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mb-1">
                      <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    </div>
                    <span className="text-[10px] text-gray-600">App Store</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mb-1">
                      <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                      </svg>
                    </div>
                    <span className="text-[10px] text-gray-600">Google Play</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center">Download via application</p>
              </div>
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
