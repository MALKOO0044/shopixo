import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { notFound } from "next/navigation";
import ProductCard from "@/components/product-card";
import Breadcrumbs from "@/components/breadcrumbs";
import type { Product } from "@/lib/types";

// Helper function to format slug back to title
function slugToTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const titleBase = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const title = `${titleBase} - Best ${titleBase} Products | Shopixo`;
  const description = `Discover top ${titleBase} products with great prices on Shopixo.`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${params.slug}` },
    openGraph: {
      title,
      description,
      url: `${getSiteUrl()}/category/${params.slug}`,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }, searchParams?: { sort?: string; min?: string; max?: string } }) {
  const supabase = getSupabaseAnonServer();
  const categoryTitle = slugToTitle(params.slug);

  let products: Product[] | null = null;
  if (!supabase) {
    // Graceful fallback when Supabase env is not configured (build-time / preview safety)
    products = [] as any;
  } else {
    const s = supabase!;
    let query = s
      .from("products")
      .select("*")
      .eq("category", categoryTitle)
      .eq("is_active", true) as any;

    // Price range filters
    const min = Number(searchParams?.min);
    const max = Number(searchParams?.max);
    if (!Number.isNaN(min)) query = query.gte("price", min);
    if (!Number.isNaN(max)) query = query.lte("price", max);

    // Sorting
    const sort = (searchParams?.sort || '').toLowerCase();
    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });

    const { data, error } = await query;
    if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
      const fb = await s
        .from("products")
        .select("*")
        .eq("category", categoryTitle);
      products = (fb.data as any[] | null) as any;
      if (fb.error) console.error("Category fallback error:", fb.error);
    } else {
      if (error) console.error("Error fetching category products:", error);
      products = (data as any[] | null) as any;
    }
  }

  if (!products || products.length === 0) {
    // Even if no products, we can show the category page with a message
    // notFound(); // Optionally, uncomment if you want to show a 404 page
  }

  return (
    <main className="container py-6">
      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: getSiteUrl() },
              { "@type": "ListItem", position: 2, name: categoryTitle, item: `${getSiteUrl()}/category/${params.slug}` },
            ],
          }),
        }}
      />
      <Breadcrumbs items={[{ name: "الرئيسية", href: "/" }, { name: categoryTitle }]} />
      {/* Sort & Filters (basic) */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">ترتيب حسب:</span>
        <div className="flex items-center gap-2">
          <a className={`rounded-md border px-3 py-1 ${searchParams?.sort === 'price-asc' ? 'bg-accent text-accent-foreground' : ''}`} href={`?sort=price-asc`}>
            السعر ↑
          </a>
          <a className={`rounded-md border px-3 py-1 ${searchParams?.sort === 'price-desc' ? 'bg-accent text-accent-foreground' : ''}`} href={`?sort=price-desc`}>
            السعر ↓
          </a>
        </div>
        {(searchParams?.min || searchParams?.max) && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground">المدى السعري:</span>
            <span className="rounded-full bg-muted px-3 py-1">{searchParams?.min ?? 0} - {searchParams?.max ?? '∞'}</span>
            <a className="text-primary underline" href={`?`}>إزالة</a>
          </div>
        )}
      </div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">{categoryTitle}</h1>
      {products && products.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">لا توجد منتجات في هذا التصنيف.</p>
      )}
    </main>
  );
}
