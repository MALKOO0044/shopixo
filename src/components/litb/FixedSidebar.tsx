"use client";

import { ShoppingCart, Smartphone, Headphones, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";

export default function FixedSidebar() {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [cartCount] = useState(3);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2">
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 bg-white rounded shadow-lg flex flex-col items-center justify-center text-gray-600 hover:text-[#e31e24] transition-colors"
        >
          <ArrowUp className="h-5 w-5" />
          <span className="text-[10px]">Top</span>
        </button>
      )}

      <a
        href="/cart"
        className="relative w-12 h-12 bg-white rounded shadow-lg flex flex-col items-center justify-center text-gray-600 hover:text-[#e31e24] transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="text-[10px]">Cart</span>
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#e31e24] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </a>

      <button className="w-12 h-12 bg-white rounded shadow-lg flex flex-col items-center justify-center text-gray-600 hover:text-[#e31e24] transition-colors">
        <Smartphone className="h-5 w-5" />
        <span className="text-[10px]">Get App</span>
      </button>

      <button className="w-12 h-12 bg-white rounded shadow-lg flex flex-col items-center justify-center text-gray-600 hover:text-[#e31e24] transition-colors">
        <Headphones className="h-5 w-5" />
        <span className="text-[10px]">Support</span>
      </button>
    </div>
  );
}
