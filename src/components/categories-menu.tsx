"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { FULL_CATEGORIES } from "@/lib/categories";

export default function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

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

  const activeCat = FULL_CATEGORIES[Math.min(active, FULL_CATEGORIES.length - 1)];

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
            <div className="flex items-center justify-between border-b p-3 md:p-4">
              <div className="text-base font-semibold">كل التصنيفات</div>
              <button aria-label="إغلاق" className="rounded-md p-2 hover:bg-muted" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Desktop layout: left rail + right content */}
            <div className="hidden md:grid max-h-[70vh] grid-cols-[220px_1fr] overflow-hidden">
              <aside className="border-l overflow-auto p-3">
                <ul className="space-y-1 text-sm">
                  {FULL_CATEGORIES.map((c, idx) => (
                    <li key={c.slug}>
                      <button
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-right hover:bg-muted ${idx===active ? 'bg-muted font-medium' : ''}`}
                        onClick={() => setActive(idx)}
                        aria-current={idx===active}
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
                    activeCat.children.map((child) => (
                      <Link
                        key={child.slug}
                        href={`/search?q=${encodeURIComponent(child.label)}`}
                        className="group overflow-hidden rounded-xl border bg-card shadow-soft transition hover:-translate-y-[2px] hover:shadow"
                        onClick={() => setOpen(false)}
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={child.image || "/placeholder.svg"}
                            alt={child.label}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            loading="lazy"
                            decoding="async"
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
                {FULL_CATEGORIES.map((c) => (
                  <div key={c.slug} className="overflow-hidden rounded-xl border bg-card shadow-soft">
                    <Link
                      href={`/category/${c.slug}`}
                      className="group block"
                      onClick={() => setOpen(false)}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.image || "/placeholder.svg"}
                          alt={c.label}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="p-3 text-center text-sm font-medium">{c.label}</div>
                    </Link>
                    {c.children && c.children.length > 0 && (
                      <div className="-mt-2 flex overflow-x-auto gap-2 px-3 pb-3">
                        {c.children.slice(0, 8).map((child) => (
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
