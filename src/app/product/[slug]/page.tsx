import { getSupabaseAnonServer } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductDetailsClient from "@/components/product-details-client";
import PriceComparison from "@/components/price-comparison";
import type { Metadata } from 'next'
import { getSiteUrl } from "@/lib/site";

export const revalidate = 60; // fresher PDP data every minute

// --- Generate Metadata for SEO ---
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = getSupabaseAnonServer();
  if (!supabase) {
    return {
      title: `${params.slug} | Shopixo`,
      description: 'Product details',
    };
  }
  const isNumeric = /^\d+$/.test(params.slug);
  let product: { title: string; description: string; images: string[]; slug?: string } | null = null;
  // Try slug first (even if numeric), then fallback to id
  {
    const { data, error } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .single();
    if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
      const fb = await supabase
        .from("products")
        .select("title, description, images, slug")
        .eq("slug", params.slug)
        .single();
      product = fb.data as any;
    } else {
      product = data as any;
    }
  }
  if (!product && isNumeric) {
    const { data, error } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .eq("id", Number(params.slug))
      .eq("is_active", true)
      .single();
    if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
      const fb = await supabase
        .from("products")
        .select("title, description, images, slug")
        .eq("id", Number(params.slug))
        .single();
      product = fb.data as any;
    } else {
      product = data as any;
    }
  }
 
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The product you are looking for does not exist.',
    }
  }
 
  return {
    title: `${product.title} | Shopixo`,
    description: product.description,
    alternates: {
      canonical: `/product/${(product as any).slug ?? params.slug}`,
    },
    openGraph: {
      title: `${product.title} | Shopixo`,
      description: product.description,
      images: [product.images[0]],
    },
  }
}

// --- Main Product Page Component (Server Component) ---
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const supabase = getSupabaseAnonServer();
  if (!supabase) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold">المنتج</h1>
        <p className="mt-2 text-slate-600">لا تتوفر بيانات المنتج حاليًا.</p>
      </div>
    );
  }

  const isNumeric = /^\d+$/.test(params.slug);
  let product: Product | null = null;
  // Try slug first (even if numeric)
  {
    const { data, error } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .single();
    if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
      const fb = await supabase
        .from("products")
        .select<"*", Product>("*")
        .eq("slug", params.slug)
        .single();
      product = fb.data as any;
    } else {
      product = data as any;
    }
  }
  // If not found and numeric, try by id then redirect to canonical slug
  if (!product && isNumeric) {
    const { data, error } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .eq("id", Number(params.slug))
      .eq("is_active", true)
      .single();
    if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
      const fb = await supabase
        .from("products")
        .select<"*", Product>("*")
        .eq("id", Number(params.slug))
        .single();
      product = fb.data as any;
    } else {
      product = data as any;
    }
    if (product && product.slug && product.slug !== params.slug) {
      redirect(`/product/${product.slug}`);
    }
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="container py-10">
      {/* Structured Data: Product + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description,
            image: product.images,
            sku: String(product.id),
            brand: { "@type": "Brand", name: process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo" },
            offers: {
              "@type": "Offer",
              url: `${getSiteUrl()}/product/${product.slug}`,
              priceCurrency: process.env.NEXT_PUBLIC_CURRENCY || "USD",
              price: product.price,
              availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
              { "@type": "ListItem", position: 2, name: product.category || "Shop", item: `${getSiteUrl()}/category/${(product.category || "").toLowerCase().replace(/\s+/g, '-')}` },
              { "@type": "ListItem", position: 3, name: product.title, item: `${getSiteUrl()}/product/${product.slug}` },
            ],
          }),
        }}
      />
      <ProductDetailsClient product={product}>
        <PriceComparison productId={product.id} />
      </ProductDetailsClient>
    </div>
  );
}
