function isLikelyImageUrl(s: string): boolean {
  if (!s) return false;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  if (s.startsWith('/')) return true;
  if (s.startsWith('data:image/')) return true;
  return false;
}

function pickPrimaryImage(images: any): string | null {
  try {
    if (!images) return null;
    if (Array.isArray(images)) {
      const v = images.find((s) => typeof s === 'string' && isLikelyImageUrl(s.trim())) as string | undefined;
      return v || null;
    }
    if (typeof images === 'string') {
      const s = images.trim();
      if (!s) return null;
      if (s.startsWith('[') && s.endsWith(']')) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const v = parsed.find((x) => typeof x === 'string' && isLikelyImageUrl(x.trim()));
          return (v as string) || null;
        }
      }
      if (s.includes(',')) {
        const v = s.split(',').map((x) => x.trim()).find((x) => isLikelyImageUrl(x));
        return v || null;
      }
      return isLikelyImageUrl(s) ? s : null;
    }
  } catch {}
  return null;
}
import { getSupabaseAnonServer } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductDetailsClient from "@/components/product-details-client";
import AdminProductActions from "@/components/admin-product-actions";
import PriceComparison from "@/components/price-comparison";
import type { Metadata } from 'next'
import { getSiteUrl } from "@/lib/site";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const revalidate = 60; // fresher PDP data every minute
export const dynamic = "force-dynamic"; // render per-request to include session-based admin controls

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
      images: [
        (() => {
          const img = pickPrimaryImage((product as any).images) || '/placeholder.svg';
          return img.startsWith('http') ? img : `${getSiteUrl()}${img}`;
        })(),
      ],
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

  // Normalize images field to array of strings (handles JSON string or comma-separated strings)
  try {
    const raw = (product as any).images;
    let normalized: string[] = [];
    if (Array.isArray(raw)) normalized = raw.filter((s) => typeof s === 'string');
    else if (typeof raw === 'string') {
      const s = raw.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) normalized = parsed.filter((x: any) => typeof x === 'string');
      } else if (s.includes(',')) {
        normalized = s.split(',').map((x) => x.trim()).filter(Boolean);
      } else if (s) {
        normalized = [s];
      }
    }
    (product as any).images = normalized;
  } catch {}

  // Detect admin (show inline admin actions on PDP)
  let isAdmin = false;
  try {
    const supabaseAuth = createServerComponentClient({ cookies });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user) {
      const list = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      isAdmin = list.length === 0 ? true : list.includes((user.email || "").toLowerCase());
    }
  } catch {}

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
            image: (() => {
              const imgs = Array.isArray(product.images)
                ? product.images.filter((s: any) => typeof s === 'string' && isLikelyImageUrl(s))
                : [];
              const base = imgs.length ? imgs : ['/placeholder.svg'];
              return base.map((u: string) => (u.startsWith('http') ? u : `${getSiteUrl()}${u}`));
            })(),
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
        {isAdmin && (
          <AdminProductActions
            productId={product.id}
            productSlug={product.slug as any}
            isActive={(product as any).is_active ?? true}
          />
        )}
      </ProductDetailsClient>
    </div>
  );
}
