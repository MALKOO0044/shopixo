"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
  product_count?: number;
}

interface CategorySidebarProps {
  categoryName: string;
  categorySlug: string;
  subcategories: Category[];
  minPrice?: string;
  maxPrice?: string;
  currentSort?: string;
}

export default function CategorySidebar({
  categoryName,
  categorySlug,
  subcategories,
  minPrice,
  maxPrice,
  currentSort
}: CategorySidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const [priceFrom, setPriceFrom] = useState(minPrice || "");
  const [priceTo, setPriceTo] = useState(maxPrice || "");

  const displayedCategories = showMore ? subcategories : subcategories.slice(0, 7);

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (priceFrom) params.set("min", priceFrom);
    if (priceTo) params.set("max", priceTo);
    if (currentSort) params.set("sort", currentSort);
    window.location.href = `/category/${categorySlug}${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="bg-white rounded-lg border border-gray-100 p-4 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          Filters
        </h2>

        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-800 mb-3">{categoryName}</h3>
          <ul className="space-y-2">
            {displayedCategories.map((sub) => (
              <li key={sub.id}>
                <Link
                  href={`/category/${sub.slug}`}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors block py-0.5"
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
          
          {subcategories.length > 7 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="text-sm text-gray-500 hover:text-gray-700 mt-3 flex items-center gap-1"
            >
              {showMore ? (
                <>
                  <ChevronDown className="w-4 h-4 rotate-180" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  + More
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-4">
        <h3 className="font-medium text-gray-800 mb-3">price</h3>
        <form onSubmit={handlePriceSubmit} className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400"
              min="0"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              placeholder="Max"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-gray-400"
              min="0"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Go
          </button>
        </form>
      </div>
    </aside>
  );
}
