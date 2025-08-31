import Link from "next/link";
import type { Metadata } from "next";
import TrustBadges from "@/components/trust-badges";
import ProductCard from "@/components/product-card";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: products, error } = await supabase.from("products").select("*");
  if (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <main className="container py-6">
      {(!products || products.length === 0) ? (
        <div className="rounded-md border p-6 text-slate-600">
          No products available yet. Visit <Link href="/admin/products/new" className="text-indigo-600 hover:underline">Admin → Add Product</Link> to create your first product.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product} />
          ))}
        </div>
      )}
    </main>
  );
}
