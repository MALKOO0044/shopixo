import { getSupabaseAnonServer } from "@/lib/supabase-server";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/types";

export const metadata = { title: "البحث" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const getFirst = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const q = getFirst(searchParams?.q).toLowerCase();
  const category = getFirst(searchParams?.category);
  const minPriceRaw = getFirst(searchParams?.minPrice);
  const maxPriceRaw = getFirst(searchParams?.maxPrice);
  const minRatingRaw = getFirst(searchParams?.minRating);
  const sort = getFirst(searchParams?.sort);

  const minPrice = Number.isFinite(parseFloat(minPriceRaw))
    ? parseFloat(minPriceRaw)
    : undefined;
  const maxPrice = Number.isFinite(parseFloat(maxPriceRaw))
    ? parseFloat(maxPriceRaw)
    : undefined;
  const minRating = Number.isFinite(parseFloat(minRatingRaw))
    ? parseFloat(minRatingRaw)
    : undefined;

  const supabase = getSupabaseAnonServer();

  // Fetch categories for the filter dropdown
  const { data: categoriesData } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true);
  const categories = Array.from(new Set((categoriesData ?? []).map((p: { category: string }) => p.category))).sort();

  let query = supabase.from("products").select<"*", Product>("*").eq("is_active", true);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (minPrice) {
    query = query.gte("price", minPrice);
  }
  if (maxPrice) {
    query = query.lte("price", maxPrice);
  }
  if (minRating) {
    query = query.gte("rating", minRating);
  }

  if (sort) {
    const [field, order] = sort.split("-");
    query = query.order(field, { ascending: order === "asc" });
  }

  const { data: filtered, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    // Handle error appropriately
  }

  return (
    <div className="container py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteUrl },
              { "@type": "ListItem", position: 2, name: "البحث", item: `${siteUrl}/search` },
            ],
          }),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <a href="/" className="hover:underline">الرئيسية</a>
        <span className="mx-2">/</span>
        <span>البحث</span>
      </nav>
      <h1 className="text-3xl font-bold">البحث</h1>

      <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <div className="lg:col-span-2">
          <input
            name="q"
            placeholder="ابحث عن منتجات..."
            defaultValue={getFirst(searchParams?.q)}
            className="w-full rounded-md border px-4 py-2"
          />
        </div>
        <div>
          <select name="category" defaultValue={category} className="w-full rounded-md border px-3 py-2">
            <option value="">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            name="minPrice"
            placeholder="الحد الأدنى"
            step="0.01"
            defaultValue={minPriceRaw}
            className="w-full rounded-md border px-3 py-2"
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="الحد الأقصى"
            step="0.01"
            defaultValue={maxPriceRaw}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <select name="minRating" defaultValue={minRatingRaw} className="w-full rounded-md border px-3 py-2">
            <option value="">أي تقييم</option>
            <option value="3">3+ نجوم</option>
            <option value="4">4+ نجوم</option>
            <option value="4.5">4.5+ نجوم</option>
            <option value="5">5 نجوم</option>
          </select>
        </div>
        <div>
          <select name="sort" defaultValue={sort} className="w-full rounded-md border px-3 py-2">
            <option value="">الترتيب</option>
            <option value="price-asc">السعر: الأقل إلى الأعلى</option>
            <option value="price-desc">السعر: الأعلى إلى الأقل</option>
            <option value="rating-desc">التقييم: الأعلى إلى الأقل</option>
            <option value="rating-asc">التقييم: الأقل إلى الأعلى</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            تطبيق
          </button>
          <a href="/search" className="rounded-md border px-4 py-2 hover:bg-slate-50">
            إزالة
          </a>
        </div>
      </form>

      <div className="mt-6 text-sm text-slate-600">عدد النتائج: {filtered?.length || 0}</div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered?.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
        {(!filtered || filtered.length === 0) && (
          <div className="text-slate-600">لا توجد منتجات{q ? ` لـ "${q}"` : ""}</div>
        )}
      </div>
    </div>
  );
}
