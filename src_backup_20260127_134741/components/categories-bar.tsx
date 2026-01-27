"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";

export default function CategoriesBar() {
  const pathname = usePathname();
  const activeSlug = useMemo(() => {
    if (!pathname) return null;
    const m = pathname.match(/\/category\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [pathname]);

  const scrollerRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function normalizeScrollLeft(el: HTMLElement) {
    const raw = el.scrollLeft;
    // In RTL on Chrome/Webkit scrollLeft is negative range [-max, 0]. Normalize to [0..max].
    if (raw < 0) return -raw;
    return raw; // LTR or Firefox RTL
  }

  function updateArrows() {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const n = normalizeScrollLeft(el);
    setAtStart(n <= 1);
    setAtEnd(n >= max - 1);
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    const r = new ResizeObserver(() => updateArrows());
    r.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      r.disconnect();
    };
  }, []);

  function scrollByDir(sign: 1 | -1) {
    const el = scrollerRef.current;
    if (!el) return;
    const step = 260;
    // If RTL with negative scrollLeft, invert direction
    const factor = el.scrollLeft < 0 ? -1 : 1;
    el.scrollBy({ left: sign * step * factor, behavior: "smooth" });
  }

  return (
    <nav className="w-full border-t bg-background/95" dir="ltr" aria-label="Store Categories">
      <div className="container relative">
        {/* Left/Right arrows */}
        <button
          type="button"
          onClick={() => scrollByDir(-1)}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background p-1 shadow-sm disabled:opacity-30"
          aria-label="Scroll left"
          disabled={atStart}
        >
          {/* In RTL, left button shows ChevronRight for visual cue */}
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir(1)}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-background p-1 shadow-sm disabled:opacity-30"
          aria-label="Scroll right"
          disabled={atEnd}
        >
          {/* In RTL, right button shows ChevronLeft for visual cue */}
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Gradient edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />

        <ul
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto overscroll-x-contain touch-pan-x scroll-smooth py-2 whitespace-nowrap scrollbar-hide pr-10 pl-10"
        >
          {CATEGORIES.map((c) => {
            const isActive = activeSlug === c.slug;
            return (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className={
                    "text-sm px-3 py-1 rounded-full transition-colors " +
                    (isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:text-foreground hover:bg-accent")
                  }
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
