import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductDetailsClient from "@/components/product-details-client";
import PriceComparison from "@/components/price-comparison";
import type { Metadata } from 'next'
import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- Generate Metadata for SEO ---
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createServerComponentClient({ cookies });
  const isNumeric = /^\d+$/.test(params.slug);
  let product: { title: string; description: string; images: string[]; slug?: string } | null = null;
  if (isNumeric) {
    const { data } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .eq("id", Number(params.slug))
      .eq("is_active", true)
      .single();
    product = data as any;
  } else {
    const { data } = await supabase
      .from("products")
      .select("title, description, images")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .single();
    product = data as any;
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
  const supabase = createServerComponentClient({ cookies });

  const isNumeric = /^\d+$/.test(params.slug);
  let product: Product | null = null;
  if (isNumeric) {
    const { data } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .eq("id", Number(params.slug))
      .eq("is_active", true)
      .single();
    product = data as any;
    // Redirect to canonical slug URL if found
    if (product && product.slug && String(product.id) === params.slug) {
      redirect(`/product/${product.slug}`);
    }
  } else {
    const { data } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .eq("slug", params.slug)
      .eq("is_active", true)
      .single();
    product = data as any;
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
