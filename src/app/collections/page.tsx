import Link from "next/link"
import { CATEGORIES } from "@/lib/categories"

export const metadata = { title: "المجموعات", description: "استكشف مجموعاتنا" }

export default function CollectionsPage() {
  const groups = CATEGORIES
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">المجموعات</h1>
      <p className="mt-2 text-slate-600">استكشف التصنيفات الرئيسية وتسوّق حسب اهتماماتك.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {groups.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="relative rounded-[var(--radius-lg)] border bg-card px-4 py-3 text-center text-sm shadow-soft transition will-change-transform hover:-translate-y-[4px] hover:shadow-soft"
            style={{ backgroundImage: "linear-gradient(90deg, hsl(var(--primary)) 0, hsl(var(--primary)) 6px, transparent 6px)", backgroundRepeat: 'no-repeat' } as any}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
