import ProductCard from "@/components/product-card";
import AdminProductActions from "@/components/admin-product-actions";
import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import Breadcrumbs from "@/components/breadcrumbs";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import FiltersPanel from "@/components/pro/FiltersPanel";

export const metadata = { title: "Shop", description: "Shop the latest products and deals" };
export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams?: { sort?: string; min?: string; max?: string } }) {
  const supabase = getSupabaseAnonServer();
  const supabaseAuth = createServerComponentClient({ cookies });
  const { data: { user } } = await supabaseAuth.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const isPrivileged = !!user && (adminEmails.length === 0
    ? (process.env.NODE_ENV !== "production")
    : adminEmails.includes((user.email || "").toLowerCase()));
  const applySortAndFilter = (list: Product[]): Product[] => {
    let arr = [...list];
    const sort = (searchParams?.sort || '').toLowerCase();
    const min = Number(searchParams?.min);
    const max = Number(searchParams?.max);
    if (!Number.isNaN(min)) arr = arr.filter((p) => p.price >= min);
    if (!Number.isNaN(max)) arr = arr.filter((p) => p.price <= max);
    if (sort === 'price-asc') arr = arr.sort((a,b) => a.price - b.price);
    else if (sort === 'price-desc') arr = arr.sort((a,b) => b.price - a.price);
    return arr;
  };
  
  if (!supabase) {
    return (
      <div className="container py-10">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop" }]} />
        <h1 className="text-3xl font-bold">Shop</h1>
        <p className="mt-2 text-slate-600">Discover our curated selection of trending products.</p>
        <FiltersPanel basePath="/shop" sort={searchParams?.sort} min={searchParams?.min} max={searchParams?.max} />
        <div className="mt-8 text-slate-600">No products available.</div>
      </div>
    );
  }
  let products: any[] | null = null;
  let error: any = null;
  {
    let query = supabase.from("products").select("*").or("is_active.is.null,is_active.eq.true") as any;
    const sort = (searchParams?.sort || '').toLowerCase();
    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });
    const min = Number(searchParams?.min);
    const max = Number(searchParams?.max);
    if (!Number.isNaN(min)) query = query.gte('price', min);
    if (!Number.isNaN(max)) query = query.lte('price', max);
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
        <p className="mt-2 text-slate-500">There was a problem connecting to the database. Please try again later.</p>
        <p className="mt-4 text-xs text-slate-400">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Shop" }]} />
      <h1 className="text-3xl font-bold">Shop</h1>
      <p className="mt-2 text-slate-600">Discover our curated selection of trending products.</p>
      <FiltersPanel basePath="/shop" sort={searchParams?.sort} min={searchParams?.min} max={searchParams?.max} />
      <div className="mt-8">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <div key={p.id} className="space-y-2">
                <ProductCard product={p as Product} />
                {isPrivileged && (
                  <AdminProductActions productId={p.id} productSlug={(p as any).slug} isActive={(p as any).is_active ?? true} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-600">No products available.</div>
        )}
      </div>
    </div>
  );
}
