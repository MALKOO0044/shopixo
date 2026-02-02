"use client";

import Link from "next/link";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Route } from "next";
import { FULL_CATEGORIES, type FullCategory, type SubcategoryGroup } from "@/lib/categories";

interface MenuCategory {
  id: number;
  name: string;
  slug: string;
  groups?: SubcategoryGroup[];
}

const MENU_CATEGORIES: MenuCategory[] = FULL_CATEGORIES.map((cat, index) => ({
  id: index + 1,
  name: cat.label,
  slug: cat.slug,
  groups: cat.groups
}));

const QUICK_LINKS = [
  { label: "Flash Sale", href: "/flash-sale", highlight: true },
  { label: "Women", href: "/category/womens-clothing" },
  { label: "Men", href: "/category/mens-clothing" },
  { label: "Best Sellers", href: "/bestsellers" },
  { label: "Home Décor", href: "/category/home-garden-furniture" },
  { label: "Toys&Hobbies", href: "/category/toys-kids-babies" },
  { label: "Shoes&Accessories", href: "/category/bags-shoes" },
  { label: "Christmas", href: "/category/festive-party-supplies", special: true },
  { label: "Special Offer", href: "/sale" },
];

export default function LitbNavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [isInsideDropdown, setIsInsideDropdown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragActiveRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; startedOutside: boolean }>({ x: 0, y: 0, startedOutside: false });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track if page is scrolled to add a subtle shadow to the sticky nav
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!menuOpen || !buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      // Use viewport coordinates for a fixed-position dropdown
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
      });
    };
    updatePosition();
    if (menuOpen) {
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [menuOpen]);

  // Lock body scroll while the categories mega menu is open; keep only the panel scrollable.
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
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

  // Close on drag: if the user presses and drags outside the menu/button
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const insideDropdown = !!(dropdownRef.current && dropdownRef.current.contains(target));
      const insideButton = !!(buttonRef.current && buttonRef.current.contains(target));
      dragActiveRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY, startedOutside: !(insideDropdown || insideButton) };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragActiveRef.current) return;
      const { x, y, startedOutside } = dragStartRef.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      const moved = Math.hypot(dx, dy) > 10;
      if (startedOutside && moved) {
        setMenuOpen(false);
        setHoveredCategoryId(null);
        setIsInsideDropdown(false);
        dragActiveRef.current = false;
      }
    };
    const onPointerUpOrCancel = () => {
      dragActiveRef.current = false;
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUpOrCancel);
    document.addEventListener('pointercancel', onPointerUpOrCancel);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUpOrCancel);
      document.removeEventListener('pointercancel', onPointerUpOrCancel);
    };
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
    }, 150);
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

  const hoveredCategory = MENU_CATEGORIES.find(c => c.id === hoveredCategoryId);

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
      <div className="flex shadow-xl border border-gray-200 rounded-sm">
        <div className="w-[240px] bg-[#f8f8f8] max-h-[500px] overflow-y-auto">
          {MENU_CATEGORIES.map((cat) => {
            const hasGroups = cat.groups && cat.groups.length > 0;
            const isHovered = hoveredCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                className={`flex items-center justify-between px-4 py-2.5 text-[13px] cursor-pointer transition-all duration-100 border-l-2 ${
                  isHovered 
                    ? 'bg-white text-[#e31e24] border-l-[#e31e24] font-medium' 
                    : 'hover:bg-white hover:text-[#e31e24] border-l-transparent'
                }`}
                onMouseEnter={() => setHoveredCategoryId(cat.id)}
              >
                <Link
                  href={`/category/${cat.slug}` as Route}
                  className="flex-1 truncate"
                  onClick={handleCategoryClick}
                >
                  {cat.name}
                </Link>
                {hasGroups && (
                  <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 ml-2 ${isHovered ? 'text-[#e31e24]' : 'text-gray-400'}`} />
                )}
              </div>
            );
          })}
        </div>

        {hoveredCategoryId !== null && hoveredCategory && hoveredCategory.groups && hoveredCategory.groups.length > 0 && (
          <div className="w-[750px] bg-white max-h-[500px] overflow-y-auto p-5">
            <div className="grid grid-cols-4 gap-x-5 gap-y-4">
              {hoveredCategory.groups.map((group, groupIdx) => (
                <div key={groupIdx} className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-gray-900 mb-2 truncate" title={group.groupName}>
                    {group.groupName}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {group.items.map((item, itemIdx) => (
                      <Link
                        key={itemIdx}
                        href={`/category/${item.slug}` as Route}
                        className="text-[12px] text-gray-600 hover:text-[#e31e24] transition-colors truncate"
                        onClick={handleCategoryClick}
                        title={item.label}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <nav className={`sticky top-[var(--site-header-h,60px)] z-[180] ${stuck ? 'bg-white shadow-sm border-b border-gray-200' : 'bg-white'}`}>
      <div className="max-w-[1320px] mx-auto px-2">
        <div className="flex items-center gap-6 h-[42px] overflow-x-auto hide-scrollbar">
          <div className="relative">
            <button
              ref={buttonRef}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex items-center gap-1.5 text-sm font-medium shrink-0 px-3 py-1.5 rounded transition-colors ${
                menuOpen ? 'bg-[#e31e24] text-white' : 'hover:text-[#e31e24]'
              }`}
            >
              <Menu className="h-4 w-4" />
              <span>All Categories</span>
              <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          <div className="flex items-center gap-5">
            {QUICK_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href as Route}
                className={`text-sm whitespace-nowrap hover:text-[#e31e24] transition-colors shrink-0 ${
                  item.highlight ? "text-[#e31e24] font-semibold" : ""
                } ${item.special ? "text-[#e31e24]" : ""}`}
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
