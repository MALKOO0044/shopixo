import Link from "next/link";
import type { Metadata } from "next";
import TrustBadges from "@/components/trust-badges";
import ProductCard from "@/components/ProductCard";
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

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: products } = await supabase.from("products").select("*").limit(4);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Shopixo",
            url: siteUrl,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            url: siteUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteUrl}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
        <div className="container py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="badge">New season</span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                Discover trendy products on <span className="text-brand">Shopixo</span>
              </h1>
              <p className="mt-6 text-lg text-slate-600">
                A professional shopping experience with secure checkout, fast delivery, and curated collections.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/shop" className="btn-primary">Shop Now</Link>
                <Link href="/about" className="inline-flex items-center font-medium text-slate-900 underline decoration-2 underline-offset-4">Learn more</Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span>🔒</span> Secure checkout
                </div>
                <div className="flex items-center gap-2">
                  <span>↩️</span> 30-day returns
                </div>
                <div className="flex items-center gap-2">
                  <span>⭐</span> 4.8/5 reviews
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-brand to-accent shadow-lg"></div>
            </div>
          </div>
        </div>
      </section>
      <TrustBadges />
      <section className="container py-16">
        <h2 className="text-2xl font-bold">Featured products</h2>
        <p className="mt-2 text-slate-600">Handpicked items loved by our customers.</p>
        <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {products?.map((p) => (
            <ProductCard key={p.id} product={p as Product} />
          ))}
        </div>
      </section>
    </>
  );
}
