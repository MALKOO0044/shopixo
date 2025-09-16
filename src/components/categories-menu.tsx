"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { FULL_CATEGORIES, type FullCategory, type FullCategoryChild } from "@/lib/categories";

export default function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const normalized = (s: string) => (s || "").toLowerCase().trim();
  const filteredCats: FullCategory[] = useMemo(() => {
    if (!query) return FULL_CATEGORIES;
    const q = normalized(query);
    return FULL_CATEGORIES.map((c) => {
      const children = (c.children || []).filter((ch) => normalized(ch.label).includes(q));
      const matchSelf = normalized(c.label).includes(q);
      if (matchSelf || children.length) return { ...c, children };
      return null as any;
    }).filter((x): x is FullCategory => Boolean(x));
  }, [query]);

  const safeActiveIndex = Math.min(active, Math.max(0, filteredCats.length - 1));
  const activeCat = filteredCats[safeActiveIndex];

  return (
    <div className="relative" dir="rtl">
      <button
        type="button"
        aria-label="فتح القائمة"
        className="inline-flex items-center rounded-md border p-2 text-sm hover:bg-muted"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={panelRef}
            className="absolute inset-x-0 top-0 mx-auto h-[88vh] w-full max-w-6xl overflow-hidden rounded-b-2xl border bg-background shadow-xl md:top-8 md:h-auto md:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b p-3 md:p-4">
              <div className="flex-1">
                <div className="text-base font-semibold mb-2">كل التصنيفات</div>
                <label className="sr-only" htmlFor="cat-search">ابحث</label>
                <input
                  id="cat-search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  placeholder="ابحث في التصنيفات..."
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>
              <button aria-label="إغلاق" className="self-start rounded-md p-2 hover:bg-muted" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop layout: left rail + right content */}
            <div className="hidden md:grid max-h-[70vh] grid-cols-[240px_1fr] overflow-hidden">
              <aside className="border-l overflow-auto p-3">
                <ul className="space-y-1 text-sm">
                  {filteredCats.map((c: FullCategory, idx) => (
                    <li key={c.slug}>
                      <button
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-right hover:bg-muted ${idx===safeActiveIndex ? 'bg-muted font-medium' : ''}`}
                        onClick={() => setActive(idx)}
                        aria-current={idx===safeActiveIndex}
                      >
                        <span className="truncate">{c.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
              <section className="overflow-auto p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{activeCat?.label}</h3>
                  {activeCat && (
                    <Link href={`/category/${activeCat.slug}`} className="text-sm text-primary hover:underline" onClick={() => setOpen(false)}>عرض الكل</Link>
                  )}
                </div>
                {/* Children grid */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                  {activeCat?.children?.length ? (
                    activeCat.children.map((child: FullCategoryChild) => (
                      <Link
                        key={child.slug}
                        href={`/search?q=${encodeURIComponent(child.label)}`}
                        className="group overflow-hidden rounded-xl border bg-card shadow-soft transition hover:-translate-y-[2px] hover:shadow"
                        onClick={() => setOpen(false)}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                          <Image
                            src={child.image || "/placeholder.svg"}
                            alt={child.label}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            priority={false}
                          />
                        </div>
                        <div className="p-3 text-center text-sm font-medium">{child.label}</div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">لا توجد أقسام فرعية.</div>
                  )}
                </div>
              </section>
            </div>

            {/* Mobile layout: stacked cards + children chips */}
            <div className="block max-h-[calc(88vh-56px)] overflow-auto p-4 md:hidden">
              <div className="grid grid-cols-2 gap-3">
                {filteredCats.map((c: FullCategory) => (
                  <div key={c.slug} className="overflow-hidden rounded-xl border bg-card shadow-soft">
                    <Link
                      href={`/category/${c.slug}`}
                      className="group block"
                      onClick={() => setOpen(false)}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                        <Image
                          src={c.image || "/placeholder.svg"}
                          alt={c.label}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          priority={false}
                        />
                      </div>
                      <div className="p-3 text-center text-sm font-medium">{c.label}</div>
                    </Link>
                    {c.children && c.children.length > 0 && (
                      <div className="-mt-2 flex overflow-x-auto gap-2 px-3 pb-3">
                        {c.children.slice(0, 8).map((child: FullCategoryChild) => (
                          <Link
                            key={child.slug}
                            href={`/search?q=${encodeURIComponent(child.label)}`}
                            className="shrink-0 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/70"
                            onClick={() => setOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
