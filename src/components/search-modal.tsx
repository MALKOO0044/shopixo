"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon, X } from "lucide-react";
import Link from "next/link";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function SearchModal({ renderTrigger }: { renderTrigger?: (open: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  type SearchItem = { id: number; slug: string; title: string; price: number; images?: string[] };
  const [items, setItems] = useState<SearchItem[]>([]);
  const debounced = useDebouncedValue(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debounced) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
        const json = await res.json();
        if (!cancelled) setItems(json.items || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <>
      {renderTrigger ? (
        <>{renderTrigger(() => setOpen(true))}</>
      ) : (
        <button
          aria-label="Open search"
          className="inline-flex items-center justify-center rounded-md border px-2 py-2 text-sm hover:bg-muted lg:hidden"
          onClick={() => setOpen(true)}
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div aria-modal="true" role="dialog" className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 mx-auto w-full max-w-2xl rounded-b-2xl border bg-background p-4 shadow-xl">
            <div className="flex items-center gap-2">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
              <input
                ref={inputRef}
                placeholder="Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                aria-label="Search products"
              />
              <button aria-label="Close" className="rounded-md p-1 hover:bg-muted" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 max-h-[60vh] overflow-auto">
              {loading && <div className="p-3 text-sm text-muted-foreground">Searching...</div>}
              {!loading && items.length === 0 && debounced && (
                <div className="p-3 text-sm text-muted-foreground">No results for "{debounced}".</div>
              )}
              <ul className="divide-y">
                {items.map((it: SearchItem) => (
                  <li key={it.id} className="py-2">
                    <Link
                      href={`/product/${it.slug}`}
                      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
                      onClick={() => setOpen(false)}
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.images?.[0] || '/placeholder.svg'}
                          alt={it.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget as HTMLImageElement;
                            if (el.src.endsWith('/placeholder.svg')) return;
                            el.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">{it.title}</div>
                        <div className="text-xs text-muted-foreground">{new Intl.NumberFormat(undefined, { style: 'currency', currency: (process.env.NEXT_PUBLIC_CURRENCY || 'USD') as any }).format(it.price || 0)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
