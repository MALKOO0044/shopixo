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
            className="absolute inset-x-0 top-0 mx-auto h-[88vh] w-full max-w-6xl overflow-hidden rounded-b-2xl border bg-background shadow-xl md:top-8 md:h-[80vh] md:rounded-2xl overscroll-contain flex flex-col touch-pan-y"
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
            <div className="hidden md:grid flex-1 min-h-0 grid-cols-[240px_1fr] overflow-hidden">
              <aside className="border-l overflow-auto p-3 min-h-0">
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
              <section className="overflow-auto p-4 min-h-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{activeCat?.label}</h3>
                  {activeCat && (
                    <Link href={`/category/${activeCat.slug}`} className="text-sm text-primary hover:underline" onClick={() => setOpen(false)}>عرض الكل</Link>
                  )}
                </div>
                {/* Children grid: circular thumbnails like Shein */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {activeCat?.children?.length ? (
                    activeCat.children.map((child: FullCategoryChild) => (
                      <Link
                        key={child.slug}
                        href={`/search?category=${encodeURIComponent(activeCat.slug)}&q=${encodeURIComponent(child.label)}`}
                        className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center shadow-soft transition hover:-translate-y-[2px] hover:shadow"
                        onClick={() => setOpen(false)}
                      >
                        <div className="relative aspect-square w-24 overflow-hidden rounded-full bg-muted ring-1 ring-muted-foreground/10 sm:w-28">
                          <CategoryThumb parentSlug={activeCat.slug} child={child} />
                        </div>
                        <div className="text-xs sm:text-sm font-medium leading-tight">{child.label}</div>
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
                      <div className="-mt-2 flex overflow-x-auto gap-3 px-3 pb-3">
                        {c.children.slice(0, 10).map((child: FullCategoryChild) => (
                          <Link
                            key={child.slug}
                            href={`/search?category=${encodeURIComponent(c.slug)}&q=${encodeURIComponent(child.label)}`}
                            className="shrink-0 flex flex-col items-center gap-1"
                            onClick={() => setOpen(false)}
                          >
                            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted ring-1 ring-muted-foreground/10">
                              <CategoryThumb parentSlug={c.slug} child={child} />
                            </div>
                            <span className="text-[11px] leading-tight">{child.label}</span>
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

// --- Helpers ---
function getCloudinaryUrl(parentSlug: string, childSlug: string) {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return null;
  // Ex: categories/women/women-jeans.jpg
  const path = `categories/${parentSlug}/${childSlug}.jpg`;
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,c_fill,g_auto,w_560,h_560/${path}`;
}

function dataUriFromLabel(label: string) {
  const text = encodeURIComponent(label || "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='560' height='560'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#e2e8f0'/>
        <stop offset='100%' stop-color='#cbd5e1'/>
      </linearGradient>
    </defs>
    <rect width='100%' height='100%' fill='url(#g)'/>
    <circle cx='280' cy='280' r='260' fill='white' />
    <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle'
      font-family='sans-serif' font-size='44' fill='#0f172a'>${text}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

function buildSrcQueue(parentSlug: string, child: FullCategoryChild): string[] {
  const queue: string[] = [];
  // 1) exact child.image if absolute or relative
  if (child.image) queue.push(child.image);
  // 2) Cloudinary convention
  const c = getCloudinaryUrl(parentSlug, child.slug);
  if (c) queue.push(c);
  // 3) Local convention under public/categories
  queue.push(`/categories/${parentSlug}/${child.slug}.jpg`);
  queue.push(`/categories/${parentSlug}/${child.slug}.png`);
  // 4) Generic child slug at root
  queue.push(`/categories/${child.slug}.jpg`);
  queue.push(`/categories/${child.slug}.png`);
  // 5) Fallback placeholder (will be replaced by data URI on final error)
  queue.push(`/placeholder.svg`);
  return queue;
}

function CategoryThumb({ parentSlug, child }: { parentSlug: string; child: FullCategoryChild }) {
  const [index, setIndex] = useState(0);
  const srcs = useMemo(() => buildSrcQueue(parentSlug, child), [parentSlug, child.slug, child.image]);
  const src = index < srcs.length ? srcs[index] : dataUriFromLabel(child.label);
  const isData = src.startsWith('data:');
  return (
    <Image
      src={src}
      alt={child.label}
      fill
      sizes="(max-width: 768px) 6rem, (max-width: 1200px) 7rem, 7rem"
      className="object-cover"
      priority={false}
      unoptimized={isData}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
