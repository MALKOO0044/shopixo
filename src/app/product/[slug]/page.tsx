import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductDetailsClient from "@/components/product-details-client";
import PriceComparison from "@/components/price-comparison";
import type { Metadata } from 'next'

export const dynamic = "force-dynamic";
export const revalidate = 0;

// --- Generate Metadata for SEO ---
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createServerComponentClient({ cookies });
  const { data: product } = await supabase
    .from("products")
    .select("title, description, images")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();
 
  if (!product) {
    return {
      title: 'Product Not Found',
      description: 'The product you are looking for does not exist.',
    }
  }
 
  return {
    title: `${product.title} | Shopixo`,
    description: product.description,
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

  const { data: product } = await supabase
    .from("products")
    .select<"*", Product>("*")
    .eq("slug", params.slug)
    .eq("is_active", true)
    .single();

  if (!product) {
    notFound();
  }

  return (
    <div className="container py-10">
      <ProductDetailsClient product={product}>
        <PriceComparison productId={product.id} />
      </ProductDetailsClient>
    </div>
  );
}
