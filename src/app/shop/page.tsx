import ProductCard from "@/components/product-card";
import AdminProductActions from "@/components/admin-product-actions";
import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import Breadcrumbs from "@/components/breadcrumbs";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import FiltersPanel from "@/components/pro/FiltersPanel";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";

export const metadata = { title: "المتجر", description: "تسوّق أحدث المنتجات والعروض" };
export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function ShopPage({ searchParams }: { searchParams?: { sort?: string; min?: string; max?: string } }) {
  const supabase = getSupabaseAnonServer();
  // Detect admin once for rendering quick actions
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
    // Fallback: no DB configured, render sample products with filters/sort
    const products: Product[] = applySortAndFilter(SAMPLE_PRODUCTS);
    return (
      <div className="container py-10">
        <Breadcrumbs items={[{ name: "الرئيسية", href: "/" }, { name: "المتجر" }]} />
        <h1 className="text-3xl font-bold">المتجر</h1>
        <p className="mt-2 text-slate-600">اكتشف مجموعتنا المختارة من المنتجات الرائجة.</p>
        <FiltersPanel basePath="/shop" sort={searchParams?.sort} min={searchParams?.min} max={searchParams?.max} />
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p) => (
              <div key={p.id} className="space-y-2">
                <ProductCard product={p as Product} />
                {/* No admin actions without Supabase */}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  // Try to filter active products; if the column is missing (migration not applied), fallback to unfiltered query
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
        <h2 className="text-xl font-semibold text-red-600">تعذر تحميل المنتجات</h2>
        <p className="mt-2 text-slate-500">حدثت مشكلة في الاتصال بقاعدة البيانات. يرجى المحاولة لاحقًا.</p>
        <p className="mt-4 text-xs text-slate-400">الخطأ: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Breadcrumbs items={[{ name: "الرئيسية", href: "/" }, { name: "المتجر" }]} />
      <h1 className="text-3xl font-bold">المتجر</h1>
      <p className="mt-2 text-slate-600">اكتشف مجموعتنا المختارة من المنتجات الرائجة.</p>
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
          // Fallback: show sample products if DB returned empty
          <div>
            <div className="mb-3 text-sm text-slate-500">عرض منتجات تجريبية حتى تتم إضافة منتجات حقيقية.</div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {applySortAndFilter(SAMPLE_PRODUCTS).map((p) => (
                <div key={p.id} className="space-y-2">
                  <ProductCard product={p as Product} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
