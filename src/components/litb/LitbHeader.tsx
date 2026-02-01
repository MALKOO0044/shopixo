"use client";

import Link from "next/link";
import { Heart, ShoppingCart, ChevronDown, Tag } from "lucide-react";
import AnimatedSearchBar from "./AnimatedSearchBar";
import AccountDropdown from "./AccountDropdown";
import type { Route } from "next";
import { useCartCount } from "@/components/cart/CartCountProvider";
import CartDropdown from "./CartDropdown";

function USAFlag() {
  return (
    <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-sm shadow-sm">
      <clipPath id="flag-clip">
        <rect width="60" height="30" rx="1"/>
      </clipPath>
      <g clipPath="url(#flag-clip)">
        <rect fill="#bf0a30" y="0" width="60" height="2.31"/>
        <rect fill="#fff" y="2.31" width="60" height="2.31"/>
        <rect fill="#bf0a30" y="4.62" width="60" height="2.31"/>
        <rect fill="#fff" y="6.92" width="60" height="2.31"/>
        <rect fill="#bf0a30" y="9.23" width="60" height="2.31"/>
        <rect fill="#fff" y="11.54" width="60" height="2.31"/>
        <rect fill="#bf0a30" y="13.85" width="60" height="2.31"/>
        <rect fill="#fff" y="16.15" width="60" height="2.31"/>
        <rect fill="#bf0a30" y="18.46" width="60" height="2.31"/>
        <rect fill="#fff" y="20.77" width="60" height="2.31"/>
        <rect fill="#bf0a30" y="23.08" width="60" height="2.31"/>
        <rect fill="#fff" y="25.38" width="60" height="2.31"/>
        <rect fill="#bf0a30" y="27.69" width="60" height="2.31"/>
        <rect fill="#002868" width="24" height="16.15"/>
        <g fill="#fff">
          <polygon points="2,1 2.3,1.9 1.2,1.35 2.8,1.35 1.7,1.9" transform="scale(0.8)"/>
          <polygon points="6,1 6.3,1.9 5.2,1.35 6.8,1.35 5.7,1.9" transform="scale(0.8)"/>
          <polygon points="10,1 10.3,1.9 9.2,1.35 10.8,1.35 9.7,1.9" transform="scale(0.8)"/>
          <polygon points="14,1 14.3,1.9 13.2,1.35 14.8,1.35 13.7,1.9" transform="scale(0.8)"/>
          <polygon points="18,1 18.3,1.9 17.2,1.35 18.8,1.35 17.7,1.9" transform="scale(0.8)"/>
          <polygon points="22,1 22.3,1.9 21.2,1.35 22.8,1.35 21.7,1.9" transform="scale(0.8)"/>
          <circle cx="3" cy="3" r="0.6"/>
          <circle cx="7" cy="3" r="0.6"/>
          <circle cx="11" cy="3" r="0.6"/>
          <circle cx="15" cy="3" r="0.6"/>
          <circle cx="19" cy="3" r="0.6"/>
          <circle cx="5" cy="5" r="0.6"/>
          <circle cx="9" cy="5" r="0.6"/>
          <circle cx="13" cy="5" r="0.6"/>
          <circle cx="17" cy="5" r="0.6"/>
          <circle cx="21" cy="5" r="0.6"/>
          <circle cx="3" cy="7" r="0.6"/>
          <circle cx="7" cy="7" r="0.6"/>
          <circle cx="11" cy="7" r="0.6"/>
          <circle cx="15" cy="7" r="0.6"/>
          <circle cx="19" cy="7" r="0.6"/>
          <circle cx="5" cy="9" r="0.6"/>
          <circle cx="9" cy="9" r="0.6"/>
          <circle cx="13" cy="9" r="0.6"/>
          <circle cx="17" cy="9" r="0.6"/>
          <circle cx="21" cy="9" r="0.6"/>
          <circle cx="3" cy="11" r="0.6"/>
          <circle cx="7" cy="11" r="0.6"/>
          <circle cx="11" cy="11" r="0.6"/>
          <circle cx="15" cy="11" r="0.6"/>
          <circle cx="19" cy="11" r="0.6"/>
          <circle cx="5" cy="13" r="0.6"/>
          <circle cx="9" cy="13" r="0.6"/>
          <circle cx="13" cy="13" r="0.6"/>
          <circle cx="17" cy="13" r="0.6"/>
          <circle cx="21" cy="13" r="0.6"/>
        </g>
      </g>
    </svg>
  );
}

export default function LitbHeader() {
  const { count: cartCount } = useCartCount();

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

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-sm">
              <USAFlag />
              <span className="font-medium">EN</span>
              <span className="text-gray-400">|</span>
              <span className="font-medium">USD</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>

            <div className="hidden md:block">
              <AccountDropdown />
            </div>

            <Link href={"/wishlist" as Route} className="relative hover:text-[#e31e24]">
              <Heart className="h-5 w-5" />
            </Link>

            {/* Desktop: hover cart dropdown with preview; Mobile: fall back to direct link */}
            <div className="hidden md:block relative">
              <CartDropdown />
            </div>
            <Link href="/cart" className="md:hidden relative flex items-center gap-1 text-[#e31e24] font-medium">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#e31e24] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
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
