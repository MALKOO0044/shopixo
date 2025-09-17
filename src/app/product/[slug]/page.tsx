function isLikelyImageUrl(s: string): boolean {
  if (!s) return false;
  if (s.startsWith('http://') || s.startsWith('https://')) return true;
  if (s.startsWith('/')) return true;
  if (s.startsWith('data:image/')) return true;
  return false;
}
function normalizeSlugCandidate(s: string) {
  return (s || "").trim().toLowerCase().replace(/\s+/g, "-");
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
      if (/[;,|\n\r\t]/.test(s) || s.includes(',')) {
        const v = s.split(/[;,|\n\r\t,]+/).map((x) => x.trim()).find((x) => isLikelyImageUrl(x));
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
import { headers } from "next/headers";

export const revalidate = 60; // fresher PDP data every minute
export const dynamic = "force-dynamic"; // render per-request to include session-based admin controls

// --- Generate Metadata for SEO ---
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = getSupabaseAnonServer();
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  if (!supabase) {
    return {
      title: `${params.slug} | ${storeName}`,
      description: 'تفاصيل المنتج',
    };
  }
  const isNumeric = /^\d+$/.test(params.slug);
  let product: { title: string; description: string; images: string[]; slug?: string } | null = null;
  // Try slug first (even if numeric), without is_active filter
  {
    const { data } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .eq("slug", params.slug)
      .single();
    product = data as any;
  }
  // Fallbacks: case-insensitive and normalized
  if (!product) {
    const norm = normalizeSlugCandidate(params.slug);
    const { data } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .ilike("slug", norm)
      .maybeSingle();
    product = (data as any) || null;
  }
  if (!product) {
    const norm = normalizeSlugCandidate(params.slug);
    const { data } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .ilike("slug", `%${norm}%`)
      .limit(1)
      .single();
    product = (data as any) || null;
  }
  if (!product && isNumeric) {
    const { data } = await supabase
      .from("products")
      .select("title, description, images, slug")
      .eq("id", Number(params.slug))
      .single();
    product = data as any;
  }
 
  if (!product) {
    return {
      title: 'المنتج غير موجود',
      description: 'المنتج المطلوب غير متوفر.',
    }
  }
 
  return {
    title: `${product.title} | ${storeName}`,
    description: product.description,
    alternates: {
      canonical: `/product/${(product as any).slug ?? params.slug}`,
    },
    openGraph: {
      title: `${product.title} | ${storeName}`,
      description: product.description,
      images: [
        (() => {
          const img = pickPrimaryImage((product as any).images ?? (product as any).image) || '/placeholder.svg';
          return img.startsWith('http') ? img : `${getSiteUrl()}${img}`;
        })(),
      ],
    },
  }
}

// --- Main Product Page Component (Server Component) ---
export default async function ProductPage({ params, searchParams }: { params: { slug: string }, searchParams?: { debugMedia?: string } }) {
  const nonce = headers().get('x-csp-nonce') || undefined;
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
  // Try slug first (even if numeric), without is_active filter
  {
    const { data } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .eq("slug", params.slug)
      .single();
    product = data as any;
  }
  // Fallbacks: case-insensitive and normalized
  if (!product) {
    const norm = normalizeSlugCandidate(params.slug);
    const { data } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .ilike("slug", norm)
      .maybeSingle();
    product = (data as any) || null;
  }
  if (!product) {
    const norm = normalizeSlugCandidate(params.slug);
    const { data } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .ilike("slug", `%${norm}%`)
      .limit(1)
      .single();
    product = (data as any) || null;
  }
  // If not found and numeric, try by id then redirect to canonical slug
  if (!product && isNumeric) {
    const { data } = await supabase
      .from("products")
      .select<"*", Product>("*")
      .eq("id", Number(params.slug))
      .single();
    product = data as any;
    if (product && product.slug && product.slug !== params.slug) {
      redirect(`/product/${product.slug}`);
    }
  }
  // If found but slug differs only by case/format, redirect to canonical
  if (product && product.slug && product.slug !== params.slug) {
    redirect(`/product/${product.slug}`);
  }

  if (!product) {
    notFound();
  }

  // Normalize images field to array of strings (handles JSON string or comma-separated strings) with fallback to legacy 'image'
  try {
    const raw = (product as any).images ?? (product as any).image;
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
      if (list.length === 0) {
        // Default deny in production when unset; allow in development for DX
        isAdmin = process.env.NODE_ENV !== 'production';
      } else {
        isAdmin = list.includes((user.email || "").toLowerCase());
      }
    }
  } catch {}

  const debug = (searchParams?.debugMedia || "").toString() === '1' || (searchParams?.debugMedia || "").toString().toLowerCase() === 'true';

  return (
    <div className="container py-10">
      {debug && (
        <pre className="mb-4 overflow-auto rounded bg-muted p-3 text-xs" dir="ltr">
{JSON.stringify({
  slug: params.slug,
  hasProduct: !!product,
  title: product?.title,
  category: product?.category,
  rawImages: (product as any)?.image ? { image: (product as any).image, images: (product as any).images } : (product as any)?.images,
  normalizedImages: (product as any)?.images,
}, null, 2)}
        </pre>
      )}
      {/* Structured Data: Product + BreadcrumbList */}
      <script
        nonce={nonce}
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
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: getSiteUrl() },
              { "@type": "ListItem", position: 2, name: product.category || "المتجر", item: `${getSiteUrl()}/category/${(product.category || "").toLowerCase().replace(/\s+/g, '-')}` },
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
