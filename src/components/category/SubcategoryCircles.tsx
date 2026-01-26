"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCustomSubcategories, hasCustomSubcategories, type CustomSubcategory } from "@/data/custom-categories";

interface Subcategory {
  id?: number;
  name: string;
  slug: string;
  image_url?: string | null;
  sample_image?: string | null;
  product_count?: number;
}

interface SubcategoryCirclesProps {
  subcategories?: Subcategory[];
  parentSlug: string;
  showNavigationAlways?: boolean;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop&crop=center&q=90";

export default function SubcategoryCircles({ subcategories: dbSubcategories, parentSlug, showNavigationAlways = false }: SubcategoryCirclesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const customSubs = getCustomSubcategories(parentSlug);
  const hasCustom = hasCustomSubcategories(parentSlug);
  
  const displayItems: Array<{id: string | number; name: string; slug: string; image: string}> = hasCustom && customSubs
    ? customSubs.map((sub, index) => ({
        id: `custom-${index}`,
        name: sub.name,
        slug: `${parentSlug}-${sub.slug}`,
        image: sub.image
      }))
    : (dbSubcategories || []).map((sub) => ({
        id: sub.id || `db-${sub.slug}`,
        name: sub.name,
        slug: sub.slug,
        image: sub.image_url || sub.sample_image || DEFAULT_IMAGE
      }));

  const checkScrollPosition = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      checkScrollPosition();
      scrollContainer.addEventListener("scroll", checkScrollPosition);
      window.addEventListener("resize", checkScrollPosition);
      return () => {
        scrollContainer.removeEventListener("scroll", checkScrollPosition);
        window.removeEventListener("resize", checkScrollPosition);
      };
    }
  }, [displayItems]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  if (displayItems.length === 0) return null;

  return (
    <div className="relative mb-6 py-4">
      <button
        onClick={() => scroll("left")}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center transition-all hover:bg-gray-50 hover:shadow-xl border border-gray-200 ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="Scroll left"
        type="button"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth px-4 py-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={`/category/${item.slug}`}
            className="flex flex-col items-center gap-3 shrink-0 group"
          >
            <div className="w-[110px] h-[110px] md:w-[130px] md:h-[130px] rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-gray-400 transition-all duration-300 group-hover:scale-105 bg-gray-50 shadow-md group-hover:shadow-lg">
              <Image
                src={item.image}
                alt={item.name}
                width={130}
                height={130}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <span className="text-xs md:text-sm text-center text-gray-700 font-medium max-w-[130px] line-clamp-2 leading-tight">
              {item.name}
            </span>
          </Link>
        ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center transition-all hover:bg-gray-50 hover:shadow-xl border border-gray-200 ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="Scroll right"
        type="button"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
}
