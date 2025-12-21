"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const SEARCH_SUGGESTIONS = [
  "Women's Dresses",
  "Men's Jackets",
  "Running Shoes",
  "Home Décor",
  "Smart Watches",
  "Winter Coats",
  "Wedding Dresses",
  "Phone Cases",
  "LED Lights",
  "Toys & Games",
];

export default function AnimatedSearchBar() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isFocused) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = inputValue || SEARCH_SUGGESTIONS[currentIndex];
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-[500px]">
      <div className="flex items-center border-2 border-[#e31e24] rounded overflow-hidden bg-white">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full h-[38px] px-4 text-sm text-gray-700 outline-none placeholder:text-gray-400"
            placeholder=""
          />
          {!inputValue && !isFocused && (
            <span
              className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none transition-opacity duration-300 ${
                isAnimating ? "opacity-0" : "opacity-100"
              }`}
            >
              {SEARCH_SUGGESTIONS[currentIndex]}
            </span>
          )}
        </div>
        <button
          type="submit"
          className="h-[38px] w-[50px] bg-[#e31e24] flex items-center justify-center hover:bg-[#c91a1f] transition-colors"
        >
          <Search className="h-5 w-5 text-white" />
        </button>
      </div>
    </form>
  );
}
