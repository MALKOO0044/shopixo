import Link from "next/link";
import type { Metadata } from "next";
import TrustBadges from "@/components/trust-badges";
import ProductCard from "@/components/product-card";
import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Product } from "@/lib/types";

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
  let categories: string[] = [];

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

      // Featured categories (safe fallback if column missing)
      try {
        const { data: catData, error: catErr } = await supabase
          .from("products")
          .select("category")
          .eq("is_active", true);
        if (catErr && (String((catErr as any).message || "").includes("is_active") || (catErr as any).code === "42703")) {
          const fbCats = await supabase.from("products").select("category");
          categories = Array.from(new Set((fbCats.data ?? []).map((p: any) => p.category))).slice(0, 8);
        } else {
          categories = Array.from(new Set((catData ?? []).map((p: any) => p.category))).slice(0, 8);
        }
      } catch (e) {
        console.warn("Failed to fetch categories for home:", e);
      }
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
    }
  } else {
    console.warn("Supabase env vars missing; rendering without products list.");
  }

  return (
    <main className="container py-6">
      {/* Featured Categories */}
      {categories.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">تسوّق حسب التصنيف</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((c) => {
              const slug = String(c || "general").toLowerCase().replace(/\s+/g, "-");
              return (
                <Link
                  key={c}
                  href={`/category/${slug}`}
                  className="relative rounded-[var(--radius-lg)] border bg-card px-4 py-3 text-center text-sm shadow-soft transition will-change-transform hover:-translate-y-[4px] hover:shadow-soft"
                  style={{ backgroundImage: "linear-gradient(90deg, var(--accent-start-hex) 0, var(--accent-start-hex) 6px, transparent 6px)" as any, backgroundRepeat: 'no-repeat' }}
                >
                  {c}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {(!products || products.length === 0) ? (
        <div className="rounded-md border p-6 text-slate-600">
          No products available yet. Visit <Link href="/admin/products/new" className="text-indigo-600 hover:underline">Admin → Add Product</Link> to create your first product.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product} />
          ))}
        </div>
      )}
    </main>
  );
}
