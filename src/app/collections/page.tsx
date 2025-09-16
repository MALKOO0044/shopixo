import Link from "next/link"
import { FULL_CATEGORIES } from "@/lib/categories"

export const metadata = { title: "المجموعات", description: "استكشف مجموعاتنا" }

export default function CollectionsPage() {
  const groups = FULL_CATEGORIES
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">المجموعات</h1>
      <p className="mt-2 text-slate-600">استكشف التصنيفات الرئيسية وتسوّق حسب اهتماماتك.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {groups.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="group overflow-hidden rounded-xl border bg-card shadow-soft transition hover:-translate-y-[2px] hover:shadow"
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
        ))}
      </div>
    </div>
  )
}
