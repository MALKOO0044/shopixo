"use client";

import Link from "next/link";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [isInsideDropdown, setIsInsideDropdown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    if (menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [menuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isClickOnButton = buttonRef.current && buttonRef.current.contains(target);
      const isClickOnDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      
      if (!isClickOnButton && !isClickOnDropdown) {
        setMenuOpen(false);
        setHoveredCategoryId(null);
        setIsInsideDropdown(false);
      }
    }
    
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      if (!isInsideDropdown) {
        setMenuOpen(false);
        setHoveredCategoryId(null);
      }
    }, 100);
  };

  const handleDropdownMouseEnter = () => {
    clearCloseTimeout();
    setIsInsideDropdown(true);
  };

  const handleDropdownMouseLeave = (e: React.MouseEvent) => {
    setIsInsideDropdown(false);
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (buttonRef.current && buttonRef.current.contains(relatedTarget)) {
      return;
    }
    scheduleClose();
  };

  const handleButtonMouseEnter = () => {
    clearCloseTimeout();
    setMenuOpen(true);
  };

  const handleButtonMouseLeave = (e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (dropdownRef.current && dropdownRef.current.contains(relatedTarget)) {
      return;
    }
    scheduleClose();
  };

  const handleCategoryClick = () => {
    clearCloseTimeout();
    setMenuOpen(false);
    setHoveredCategoryId(null);
    setIsInsideDropdown(false);
  };

  const hoveredCategory = categories.find(c => c.id === hoveredCategoryId);
  const hasSubcategories = hoveredCategory && hoveredCategory.children && hoveredCategory.children.length > 0;

  const dropdownContent = menuOpen && mounted ? (
    <div 
      ref={dropdownRef}
      className="fixed"
      style={{ 
        top: dropdownPosition.top, 
        left: dropdownPosition.left,
        zIndex: 99999 
      }}
      onMouseEnter={handleDropdownMouseEnter}
      onMouseLeave={handleDropdownMouseLeave}
    >
      <div className="flex">
        <div className="w-[220px] bg-white shadow-2xl border max-h-[calc(100vh-120px)] overflow-y-auto">
          {categories.map((cat, index) => {
            const hasChildren = cat.children && cat.children.length > 0;
            const isHovered = hoveredCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer transition-colors ${
                  index < categories.length - 1 ? 'border-b border-gray-100' : ''
                } ${
                  isHovered ? 'bg-gray-50 text-[#e31e24]' : 'hover:bg-gray-50 hover:text-[#e31e24]'
                }`}
                onMouseEnter={() => setHoveredCategoryId(cat.id)}
              >
                <Link
                  href={`/category/${cat.slug}` as Route}
                  className="flex-1"
                  onClick={handleCategoryClick}
                >
                  {cat.name}
                </Link>
                {hasChildren && (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {hoveredCategoryId !== null && hoveredCategory && (
          <div className="w-[500px] bg-white shadow-2xl border-l max-h-[calc(100vh-120px)] overflow-y-auto p-5">
            {hoveredCategory.children && hoveredCategory.children.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                  {hoveredCategory.children.map((subcat) => (
                    <div key={subcat.id} className="mb-2">
                      <Link
                        href={`/category/${subcat.slug}` as Route}
                        className="font-semibold text-sm text-[#e31e24] hover:underline block mb-2"
                        onClick={handleCategoryClick}
                      >
                        {subcat.name}
                      </Link>
                      {subcat.children && subcat.children.length > 0 && (
                        <ul className="space-y-1">
                          {subcat.children.slice(0, 5).map((item) => (
                            <li key={item.id}>
                              <Link
                                href={`/category/${item.slug}` as Route}
                                className="text-xs text-gray-600 hover:text-[#e31e24] transition-colors block"
                                onClick={handleCategoryClick}
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                          {subcat.children.length > 5 && (
                            <li>
                              <Link
                                href={`/category/${subcat.slug}` as Route}
                                className="text-xs text-[#e31e24] hover:underline"
                                onClick={handleCategoryClick}
                              >
                                View all →
                              </Link>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/category/${hoveredCategory.slug}` as Route}
                    className="text-sm text-[#e31e24] font-medium hover:underline"
                    onClick={handleCategoryClick}
                  >
                    View all {hoveredCategory.name} →
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">
                <p className="font-semibold text-[#e31e24] mb-2">{hoveredCategory.name}</p>
                <p>Browse all products in this category</p>
                <Link
                  href={`/category/${hoveredCategory.slug}` as Route}
                  className="text-[#e31e24] hover:underline mt-2 inline-block"
                  onClick={handleCategoryClick}
                >
                  Shop Now →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <nav className="bg-white border-b relative z-50">
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex items-center gap-6 h-[42px] overflow-x-auto hide-scrollbar">
          <div className="relative">
            <button
              ref={buttonRef}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 text-sm font-medium hover:text-[#e31e24] shrink-0"
            >
              <Menu className="h-4 w-4" />
              <span>Categories</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
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

      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </nav>
  );
}
