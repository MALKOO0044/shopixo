import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { notFound } from "next/navigation";
import Breadcrumbs, { type Crumb } from "@/components/breadcrumbs";
import type { Product } from "@/lib/types";
import { labelFromSlug } from "@/lib/categories";
import { headers } from "next/headers";
import { getProductsByCategory } from "@/lib/recommendations";
import { createClient } from "@supabase/supabase-js";
import type { Route } from "next";
import CategoryHeroBanner from "@/components/category/CategoryHeroBanner";
import SubcategoryCircles from "@/components/category/SubcategoryCircles";
import CategoryProductCard from "@/components/category/CategoryProductCard";
import CategorySidebar from "@/components/category/CategorySidebar";
import SortDropdown from "@/components/category/SortDropdown";

function slugToTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = getSupabaseAdmin();
  let categoryTitle = labelFromSlug(params.slug) || params.slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  
  if (supabase) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("slug", params.slug)
      .single();
    
    if (category?.name) {
      categoryTitle = category.name;
    }
  }
  
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Shopixo";
  const title = `${categoryTitle} | ${storeName}`;
  const description = `Shop ${categoryTitle} at great prices on ${storeName}. Discover our offers and curated products.`;
  return {
    title,
    description,
    alternates: { canonical: `${getSiteUrl()}/category/${params.slug}` },
    openGraph: {
      title,
      description,
      url: `${getSiteUrl()}/category/${params.slug}`,
      type: "website",
      images: ["/logo-wordmark.svg"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/logo-wordmark.svg"] },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }, searchParams?: { sort?: string; min?: string; max?: string; page?: string } }) {
  const nonce = headers().get('x-csp-nonce') || undefined;
  const supabase = getSupabaseAnonServer();
  const supabaseAdmin = getSupabaseAdmin();
  
  let category: any = null;
  let subcategories: any[] = [];
  
  const dbClient = supabaseAdmin || supabase;
  
  if (dbClient) {
    try {
      const { data: cat, error: catError } = await dbClient
        .from("categories")
        .select("*")
        .eq("slug", params.slug)
        .single();
      
      if (catError) {
        console.error("[Category] Error fetching category:", catError.message);
      }
      
      category = cat;
      
      if (cat) {
        const { data: subs, error: subsError } = await dbClient
          .from("categories")
          .select("*")
          .eq("parent_id", cat.id)
          .eq("is_active", true)
          .order("id", { ascending: true });
        
        if (subsError) {
          console.error("[Category] Error fetching subcategories:", subsError.message);
        }
        
        subcategories = subs || [];
        console.log(`[Category] Loaded ${subcategories.length} subcategories for ${cat.name}`);
      }
    } catch (err) {
      console.error("[Category] Exception:", err);
    }
  }
  
  const categoryTitle = category?.name || labelFromSlug(params.slug) || slugToTitle(params.slug);
  const englishFallback = slugToTitle(params.slug);

  const page = Math.max(1, parseInt(searchParams?.page || "1") || 1);
  const perPage = 24;
  const offset = (page - 1) * perPage;

  let products: Product[] = [];
  let total = 0;

  const min = Number(searchParams?.min);
  const max = Number(searchParams?.max);
  const sort = (searchParams?.sort || '').toLowerCase();
  
  const pgResult = await getProductsByCategory(params.slug, { 
    limit: perPage, 
    offset,
    minPrice: !isNaN(min) ? min : undefined,
    maxPrice: !isNaN(max) ? max : undefined,
    sort: sort || undefined
  });
  if (pgResult.products.length > 0) {
    products = pgResult.products as any[];
    total = pgResult.total;
    if (!category && pgResult.category) {
      category = pgResult.category;
    }
  }
  
  if (products.length === 0 && supabase) {
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .or(`category.ilike.%${categoryTitle}%,category.ilike.%${englishFallback}%`)
      .or("is_active.is.null,is_active.eq.true") as any;

    const minPrice = Number(searchParams?.min);
    const maxPrice = Number(searchParams?.max);
    if (!Number.isNaN(minPrice)) query = query.gte("price", minPrice);
    if (!Number.isNaN(maxPrice)) query = query.lte("price", maxPrice);

    const sortParam = (searchParams?.sort || '').toLowerCase();
    if (sortParam === 'price-asc') query = query.order('price', { ascending: true });
    else if (sortParam === 'price-desc') query = query.order('price', { ascending: false });

    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;
    if (!error) {
      products = (data as any[] | null) || [];
      total = count || 0;
    }
  }

  const totalPages = Math.ceil(total / perPage);

  const breadcrumbItems: Crumb[] = [{ name: "Home", href: "/" as Route }];
  
  if (category && category.parent_id && supabaseAdmin) {
    const { data: parent } = await supabaseAdmin
      .from("categories")
      .select("name, slug, parent_id")
      .eq("id", category.parent_id)
      .single();
    
    if (parent) {
      if (parent.parent_id) {
        const { data: grandparent } = await supabaseAdmin
          .from("categories")
          .select("name, slug")
          .eq("id", parent.parent_id)
          .single();
        
        if (grandparent) {
          breadcrumbItems.push({ name: grandparent.name, href: `/category/${grandparent.slug}` as Route });
        }
      }
      breadcrumbItems.push({ name: parent.name, href: `/category/${parent.slug}` as Route });
    }
  }
  
  breadcrumbItems.push({ name: categoryTitle });

  const isTopLevelCategory = category && (!category.parent_id || category.parent_id === null) && category.level === 1;

  return (
    <main className="bg-white min-h-screen">
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbItems.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.name,
              item: item.href ? `${getSiteUrl()}${item.href}` : undefined,
            })),
          }),
        }}
      />

      <div className="max-w-[1320px] mx-auto px-4 py-6">
        <Breadcrumbs items={breadcrumbItems} />

        {isTopLevelCategory && (
          <>
            <CategoryHeroBanner 
              categorySlug={params.slug} 
              categoryName={categoryTitle} 
            />
            
            {subcategories.length > 0 && (
              <SubcategoryCircles 
                subcategories={subcategories} 
                parentSlug={params.slug} 
              />
            )}
          </>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          <CategorySidebar
            categoryName={categoryTitle}
            categorySlug={params.slug}
            subcategories={subcategories}
            minPrice={searchParams?.min}
            maxPrice={searchParams?.max}
            currentSort={searchParams?.sort}
          />
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <h1 className="text-xl font-bold text-gray-900">{categoryTitle}</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">{total} products</span>
                <SortDropdown currentSort={searchParams?.sort} />
              </div>
            </div>
            
            {products && products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {products.map((p) => (
                    <CategoryProductCard key={p.id} product={p as any} />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {page > 1 && (
                      <a
                        href={`/category/${params.slug}?page=${page - 1}${searchParams?.sort ? `&sort=${searchParams.sort}` : ''}${searchParams?.min ? `&min=${searchParams.min}` : ''}${searchParams?.max ? `&max=${searchParams.max}` : ''}`}
                        className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors text-sm"
                      >
                        Previous
                      </a>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <a
                        href={`/category/${params.slug}?page=${page + 1}${searchParams?.sort ? `&sort=${searchParams.sort}` : ''}${searchParams?.min ? `&min=${searchParams.min}` : ''}${searchParams?.max ? `&max=${searchParams.max}` : ''}`}
                        className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors text-sm"
                      >
                        Next
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No products in this category yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
