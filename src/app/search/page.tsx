import { getSupabaseAnonServer } from "@/lib/supabase-server";
import { labelFromSlug } from "@/lib/categories";
import ProductCard from "@/components/product-card";
import type { Product } from "@/lib/types";
import { headers } from "next/headers";


export const metadata = { title: "Search" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const productSelect = "id, title, slug, description, price, images, category, stock, variants, displayed_rating, rating_confidence, video_url, product_code";

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const nonce = headers().get('x-csp-nonce') || undefined;
  const getFirst = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const q = getFirst(searchParams?.q).toLowerCase();
  const rawCategory = getFirst(searchParams?.category);
  const category = labelFromSlug(rawCategory) || rawCategory;
  const minPriceRaw = getFirst(searchParams?.minPrice);
  const maxPriceRaw = getFirst(searchParams?.maxPrice);
  const minRatingRaw = getFirst(searchParams?.minRating);
  const mediaRaw = getFirst(searchParams?.media);
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

  let categories: string[] = [];
  if (supabase) {
    const { data: categoriesData } = await supabase
      .from("products")
      .select("category")
      .or("is_active.is.null,is_active.eq.true");
    categories = Array.from(new Set((categoriesData ?? []).map((p: { category: string }) => p.category))).sort();
  } else {
    categories = [];
  }

  let filtered: Product[] | null = [];
  if (!supabase) {
    filtered = [];
  } else {
    let query = supabase.from("products").select(productSelect).or("is_active.is.null,is_active.eq.true");

    if (q) {
      const skuQuery = q.startsWith('xo') ? q : `%${q}%`;
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,product_code.ilike.${skuQuery}`);
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
      query = query.gte("displayed_rating", minRating);
    }
    if (mediaRaw === 'withVideo') {
      query = query.not('video_url', 'is', null);
    } else if (mediaRaw === 'imagesOnly') {
      query = query.is('video_url', null);
    }

    if (sort) {
      const [rawField, order] = sort.split("-");
      const field = rawField === "rating" ? "displayed_rating" : rawField;
      query = query.order(field as any, { ascending: order === "asc" });
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching products:", error);
    }
    filtered = (data as Product[] | null) ?? [];
  }

  return (
    <div className="container py-10">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
              { "@type": "ListItem", position: 2, name: "Search", item: `${siteUrl}/search` },
            ],
          }),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
        <a href="/" className="hover:underline">Home</a>
        <span className="mx-2">/</span>
        <span>Search</span>
      </nav>
      <h1 className="text-3xl font-bold">Search</h1>

      <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-7" method="get">
        <div className="lg:col-span-2">
          <input
            name="q"
            placeholder="Search products..."
            defaultValue={getFirst(searchParams?.q)}
            className="w-full rounded-md border px-4 py-2"
          />
        </div>
        <div>
          <select name="category" defaultValue={category} className="w-full rounded-md border px-3 py-2">
            <option value="">All Categories</option>
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
            placeholder="Min Price"
            step="0.01"
            defaultValue={minPriceRaw}
            className="w-full rounded-md border px-3 py-2"
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="Max Price"
            step="0.01"
            defaultValue={maxPriceRaw}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <select name="minRating" defaultValue={minRatingRaw} className="w-full rounded-md border px-3 py-2">
            <option value="">Any Rating</option>
            <option value="4.0">4.0+ Stars</option>
            <option value="4.5">4.5+ Stars</option>
            <option value="4.8">4.8+ Stars</option>
            <option value="5.0">5.0 Stars</option>
          </select>
        </div>
        <div>
          <select name="media" defaultValue={mediaRaw} className="w-full rounded-md border px-3 py-2">
            <option value="">All Media</option>
            <option value="withVideo">With Video</option>
            <option value="imagesOnly">Images Only</option>
          </select>
        </div>
        <div>
          <select name="sort" defaultValue={sort} className="w-full rounded-md border px-3 py-2">
            <option value="">Sort By</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating-desc">Rating: High to Low</option>
            <option value="rating-asc">Rating: Low to High</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Apply
          </button>
          <a href="/search" className="rounded-md border px-4 py-2 hover:bg-slate-50">
            Clear
          </a>
        </div>
      </form>

      <div className="mt-6 text-sm text-slate-600">Results: {filtered?.length || 0}</div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered?.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
        {(!filtered || filtered.length === 0) && (
          <div className="text-slate-600">No products found{q ? ` for "${q}"` : ""}</div>
        )}
      </div>
    </div>
  );
}
