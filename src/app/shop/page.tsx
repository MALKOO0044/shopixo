import ProductCard from "@/components/product-card";
import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import Breadcrumbs from "@/components/breadcrumbs";

export const metadata = { title: "Shop", description: "Browse categories and trending products" };
export const revalidate = 60;

export default async function ShopPage({ searchParams }: { searchParams?: { sort?: string } }) {
  const supabase = getSupabaseAnonServer();
  // Try to filter active products; if the column is missing (migration not applied), fallback to unfiltered query
  let products: any[] | null = null;
  let error: any = null;
  {
    let query = supabase.from("products").select("*").eq("is_active", true) as any;
    const sort = (searchParams?.sort || '').toLowerCase();
    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });
    const { data, error: err } = await query;
    if (err && (String(err.message || "").includes("is_active") || err.code === "42703")) {
      const fallback = await supabase.from("products").select("*");
      products = fallback.data as any[] | null;
      error = fallback.error;
    } else {
      products = data as any[] | null;
      error = err;
    }
  }

  if (error) {
    console.error("Error fetching products:", error.message);
    return (
      <div className="container py-10 text-center">
        <h2 className="text-xl font-semibold text-red-600">Failed to load products</h2>
        <p className="mt-2 text-slate-500">There was an issue connecting to the database. Please try again later.</p>
        <p className="mt-4 text-xs text-slate-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Breadcrumbs items={[{ name: "الرئيسية", href: "/" }, { name: "المتجر" }]} />
      <h1 className="text-3xl font-bold">Shop</h1>
      <p className="mt-2 text-slate-600">Explore our curated selection of trending products.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">ترتيب حسب:</span>
        <div className="flex items-center gap-2">
          <a className={`rounded-md border px-3 py-1 ${searchParams?.sort === 'price-asc' ? 'bg-accent text-accent-foreground' : ''}`} href={`?sort=price-asc`}>
            السعر ↑
          </a>
          <a className={`rounded-md border px-3 py-1 ${searchParams?.sort === 'price-desc' ? 'bg-accent text-accent-foreground' : ''}`} href={`?sort=price-desc`}>
            السعر ↓
          </a>
        </div>
      </div>
      <div className="mt-8">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p as Product} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border p-6 text-center text-slate-500">
            <p>No products found at the moment.</p>
            <p className="mt-2 text-sm">Please check back later or visit the admin panel to add new products.</p>
          </div>
        )}
      </div>
    </div>
  );
}
