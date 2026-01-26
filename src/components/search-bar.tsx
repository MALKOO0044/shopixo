"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "./ui/input";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: number; slug: string; title: string; price: number; images?: string[] };

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebouncedValue(q, 250);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debounced || debounced.trim().length < 2) {
        setItems([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debounced.trim())}`);
        const json = await res.json();
        if (!cancelled) {
          setItems((json?.items || []) as Item[]);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (open && active >= 0 && items[active]) {
      router.push(`/product/${items[active].slug}`);
      setOpen(false);
      return;
    }
    const formData = new FormData(e.currentTarget);
    const query = (formData.get("q") as string) || q;
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : `/search`);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (active >= 0 && items[active]) {
        e.preventDefault();
        router.push(`/product/${items[active].slug}`);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function onBlur() {
    setTimeout(() => setOpen(false), 120);
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-md" role="search">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="search"
        name="q"
        placeholder="Search products..."
        aria-label="Search"
        autoComplete="off"
        className="w-full rounded-md bg-background pl-9 pr-4 py-2 text-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => items.length > 0 && setOpen(true)}
        onBlur={onBlur}
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-md border bg-background shadow-xl">
          <ul ref={listRef} role="listbox" aria-label="Suggestions" className="max-h-80 overflow-auto">
            {loading && <li className="p-3 text-sm text-muted-foreground">Searching...</li>}
            {!loading && items.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">No results found</li>
            )}
            {items.map((it, idx) => (
              <li
                key={it.id}
                role="option"
                aria-selected={active === idx}
                className={cn(
                  "cursor-pointer px-3 py-2 text-sm hover:bg-muted",
                  active === idx && "bg-muted"
                )}
                onMouseEnter={() => setActive(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(`/product/${it.slug}`);
                  setOpen(false);
                }}
                title={it.title}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 overflow-hidden rounded bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={(it.images && it.images[0]) || "/placeholder.svg"}
                      alt={it.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        if (!el.src.endsWith('/placeholder.svg')) el.src = '/placeholder.svg';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{it.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: (process.env.NEXT_PUBLIC_CURRENCY || 'USD') as any }).format(it.price || 0)}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
