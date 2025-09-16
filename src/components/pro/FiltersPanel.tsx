"use client"

import { useState } from "react"

export default function FiltersPanel({
  basePath,
  sort,
  min,
  max,
  labels = { title: "تصفية" }
}: {
  basePath: string
  sort?: string
  min?: string
  max?: string
  labels?: { title?: string }
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-4" dir="rtl">
      {/* Mobile toggle */}
      <div className="flex items-center gap-3 lg:hidden">
        <button type="button" onClick={() => setOpen(v => !v)} className="rounded-md border px-3 py-2 text-sm">
          {labels.title}
        </button>
      </div>
      <div className={`mt-3 ${open ? '' : 'hidden'} lg:block`}>
        <form method="get" action={basePath} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">ترتيب حسب:</span>
          <div className="flex items-center gap-2">
            <a className={`rounded-md border px-3 py-1 ${sort === 'price-asc' ? 'bg-accent text-accent-foreground' : ''}`} href={`${basePath}?sort=price-asc${min?`&min=${encodeURIComponent(min)}`:''}${max?`&max=${encodeURIComponent(max)}`:''}`}>
              السعر ↑
            </a>
            <a className={`rounded-md border px-3 py-1 ${sort === 'price-desc' ? 'bg-accent text-accent-foreground' : ''}`} href={`${basePath}?sort=price-desc${min?`&min=${encodeURIComponent(min)}`:''}${max?`&max=${encodeURIComponent(max)}`:''}`}>
              السعر ↓
            </a>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <label className="text-muted-foreground" htmlFor="min">السعر من</label>
            <input id="min" name="min" inputMode="numeric" pattern="[0-9]*" defaultValue={min || ''} className="h-9 w-24 rounded-md border px-2" dir="ltr" />
            <label className="text-muted-foreground" htmlFor="max">إلى</label>
            <input id="max" name="max" inputMode="numeric" pattern="[0-9]*" defaultValue={max || ''} className="h-9 w-24 rounded-md border px-2" dir="ltr" />
            {sort && <input type="hidden" name="sort" value={sort} />}
            <button className="rounded-[var(--radius-sm)] border px-3 py-1">تطبيق</button>
            {(min || max) && (
              <a className="text-primary underline" href={`${basePath}${sort?`?sort=${encodeURIComponent(sort)}`:''}`}>إزالة</a>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
