import ProductCard from "@/components/product-card";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Product } from "@/lib/types";

export const metadata = { title: "Shop", description: "Browse categories and trending products" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ShopPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: products, error } = await supabase.from("products").select("*").eq("is_active", true);

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
      <h1 className="text-3xl font-bold">Shop</h1>
      <p className="mt-2 text-slate-600">Explore our curated selection of trending products.</p>
      <div className="mt-8">
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
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
