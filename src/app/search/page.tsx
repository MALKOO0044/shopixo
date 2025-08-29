import ProductCard from "@/components/product-card";
import { products } from "@/lib/products";

export const metadata = { title: "Search" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const getFirst = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const q = getFirst(searchParams.q).toLowerCase();
  const category = getFirst(searchParams.category);
  const minPriceRaw = getFirst(searchParams.minPrice);
  const maxPriceRaw = getFirst(searchParams.maxPrice);
  const minRatingRaw = getFirst(searchParams.minRating);
  const sort = getFirst(searchParams.sort);

  const minPrice = Number.isFinite(parseFloat(minPriceRaw))
    ? parseFloat(minPriceRaw)
    : undefined;
  const maxPrice = Number.isFinite(parseFloat(maxPriceRaw))
    ? parseFloat(maxPriceRaw)
    : undefined;
  const minRating = Number.isFinite(parseFloat(minRatingRaw))
    ? parseFloat(minRatingRaw)
    : undefined;

  const categories = Array.from(new Set(products.map((p) => p.category))).sort();

  let filtered = products.filter((p) => {
    const matchesQuery = q
      ? [p.title, p.description, p.category]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q))
      : true;
    const matchesCategory = category
      ? p.category.toLowerCase() === category.toLowerCase()
      : true;
    const matchesMinPrice = typeof minPrice === "number" ? p.price >= minPrice : true;
    const matchesMaxPrice = typeof maxPrice === "number" ? p.price <= maxPrice : true;
    const matchesMinRating = typeof minRating === "number" ? p.rating >= minRating : true;
    return (
      matchesQuery &&
      matchesCategory &&
      matchesMinPrice &&
      matchesMaxPrice &&
      matchesMinRating
    );
  });

  if (sort === "price-asc") filtered = filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered = filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating-desc") filtered = filtered.sort((a, b) => b.rating - a.rating);
  else if (sort === "rating-asc") filtered = filtered.sort((a, b) => a.rating - b.rating);

  return (
    <div className="container py-10">
      <script
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

      <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
        <div className="lg:col-span-2">
          <input
            name="q"
            placeholder="Search products..."
            defaultValue={getFirst(searchParams.q)}
            className="w-full rounded-md border px-4 py-2"
          />
        </div>
        <div>
          <select name="category" defaultValue={category} className="w-full rounded-md border px-3 py-2">
            <option value="">All categories</option>
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
            placeholder="Min $"
            step="0.01"
            defaultValue={minPriceRaw}
            className="w-full rounded-md border px-3 py-2"
          />
          <input
            type="number"
            name="maxPrice"
            placeholder="Max $"
            step="0.01"
            defaultValue={maxPriceRaw}
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <select name="minRating" defaultValue={minRatingRaw} className="w-full rounded-md border px-3 py-2">
            <option value="">Any rating</option>
            <option value="3">3+ stars</option>
            <option value="4">4+ stars</option>
            <option value="4.5">4.5+ stars</option>
            <option value="5">5 stars</option>
          </select>
        </div>
        <div>
          <select name="sort" defaultValue={sort} className="w-full rounded-md border px-3 py-2">
            <option value="">Sort</option>
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

      <div className="mt-6 text-sm text-slate-600">{filtered.length} results</div>

      <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
        {filtered.length === 0 && (
          <div className="text-slate-600">No products found{q ? ` for "${q}"` : ""}</div>
        )}
      </div>
    </div>
  );
}
