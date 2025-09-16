import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/product-card";
import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";
import Hero from "@/components/pro/Hero";
import ValueProps from "@/components/pro/ValueProps";
import Newsletter from "@/components/pro/Newsletter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Shopixo — Modern Online Store",
  description: "Shopixo is a modern, professional online store.",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Shopixo — Modern Online Store",
    description: "Shopixo is a modern, professional online store.",
    siteName: "Shopixo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopixo — Modern Online Store",
    description: "Shopixo is a modern, professional online store.",
  },
  alternates: { canonical: "/" },
};

export const revalidate = 60;

export default async function HomePage() {
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let products: any[] | null = null;
  const categories = CATEGORIES;

  if (hasSupabaseEnv) {
    try {
      const supabase = getSupabaseAnonServer()!;
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true);
      if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
        // Column not found yet (migration not applied) → fallback to unfiltered query
        const fb = await supabase.from("products").select("*");
        if (fb.error) console.error("Error fetching products (fallback):", fb.error);
        products = (fb.data as any[] | null) ?? null;
      } else {
        if (error) console.error("Error fetching products:", error);
        products = (data as any[] | null) ?? null;
      }

      // Categories are predefined; no need to query them from DB
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
    }
  } else {
    console.warn("Supabase env vars missing; rendering without products list.");
  }

  return (
    <main>
      <Hero />
      <ValueProps />
      <div className="container py-8">
        {/* Best Sellers / Featured */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-bold">الأكثر مبيعًا</h2>
          {(!products || products.length === 0) ? (
            <div className="rounded-md border p-6 text-slate-600">
              لا توجد منتجات بعد. انتقل إلى <Link href="/admin/products/new" className="text-indigo-600 hover:underline">إضافة منتج</Link> لإنشاء أول منتج.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.slice(0, 10).map((p) => (
                <ProductCard key={p.id} product={p as Product} />
              ))}
            </div>
          )}
        </section>
      </div>
      <Newsletter />
    </main>
  );
}
