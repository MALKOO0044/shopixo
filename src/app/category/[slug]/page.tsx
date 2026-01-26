import { getSupabaseAnonServer } from "@/lib/supabase-server";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import { notFound } from "next/navigation";
<<<<<<< HEAD
import Breadcrumbs, { type Crumb } from "@/components/breadcrumbs";
import type { Product } from "@/lib/types";
import { labelFromSlug } from "@/lib/categories";
=======
import ProductCard from "@/components/product-card";
import Breadcrumbs, { type Crumb } from "@/components/breadcrumbs";
import type { Product } from "@/lib/types";
import { labelFromSlug } from "@/lib/categories";
import FiltersPanel from "@/components/pro/FiltersPanel";
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
import { headers } from "next/headers";
import { getProductsByCategory } from "@/lib/recommendations";
import { createClient } from "@supabase/supabase-js";
import type { Route } from "next";
<<<<<<< HEAD
import CategoryHeroBanner from "@/components/category/CategoryHeroBanner";
import SubcategoryCircles from "@/components/category/SubcategoryCircles";
import CategoryProductCard from "@/components/category/CategoryProductCard";
import CategorySidebar from "@/components/category/CategorySidebar";
import SortDropdown from "@/components/category/SortDropdown";
=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

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
  
<<<<<<< HEAD
=======
  // Try to get category name from database
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
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
  
<<<<<<< HEAD
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
=======
  // Get category from database
  let category: any = null;
  let subcategories: any[] = [];
  
  if (supabaseAdmin) {
    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("slug", params.slug)
      .single();
    
    category = cat;
    
    // Get subcategories
    if (cat) {
      const { data: subs } = await supabaseAdmin
        .from("categories")
        .select("*")
        .eq("parent_id", cat.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      
      subcategories = subs || [];
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    }
  }
  
  const categoryTitle = category?.name || labelFromSlug(params.slug) || slugToTitle(params.slug);
  const englishFallback = slugToTitle(params.slug);

<<<<<<< HEAD
=======
  // Pagination
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  const page = Math.max(1, parseInt(searchParams?.page || "1") || 1);
  const perPage = 24;
  const offset = (page - 1) * perPage;

  let products: Product[] = [];
  let total = 0;

<<<<<<< HEAD
=======
  // Parse filter parameters
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  const min = Number(searchParams?.min);
  const max = Number(searchParams?.max);
  const sort = (searchParams?.sort || '').toLowerCase();
  
<<<<<<< HEAD
=======
  // Use pg-based recommendations service for products (bypasses Supabase schema cache)
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
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
  
<<<<<<< HEAD
=======
  // Fallback to text-based category search
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  if (products.length === 0 && supabase) {
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .or(`category.ilike.%${categoryTitle}%,category.ilike.%${englishFallback}%`)
      .or("is_active.is.null,is_active.eq.true") as any;

<<<<<<< HEAD
    const minPrice = Number(searchParams?.min);
    const maxPrice = Number(searchParams?.max);
    if (!Number.isNaN(minPrice)) query = query.gte("price", minPrice);
    if (!Number.isNaN(maxPrice)) query = query.lte("price", maxPrice);

    const sortParam = (searchParams?.sort || '').toLowerCase();
    if (sortParam === 'price-asc') query = query.order('price', { ascending: true });
    else if (sortParam === 'price-desc') query = query.order('price', { ascending: false });
=======
    const min = Number(searchParams?.min);
    const max = Number(searchParams?.max);
    if (!Number.isNaN(min)) query = query.gte("price", min);
    if (!Number.isNaN(max)) query = query.lte("price", max);

    const sort = (searchParams?.sort || '').toLowerCase();
    if (sort === 'price-asc') query = query.order('price', { ascending: true });
    else if (sort === 'price-desc') query = query.order('price', { ascending: false });
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

    query = query.range(offset, offset + perPage - 1);

    const { data, error, count } = await query;
    if (!error) {
      products = (data as any[] | null) || [];
      total = count || 0;
    }
  }

  const totalPages = Math.ceil(total / perPage);

<<<<<<< HEAD
=======
  // Build breadcrumbs
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
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

<<<<<<< HEAD
  const isTopLevelCategory = category && (!category.parent_id || category.parent_id === null) && category.level === 1;

  return (
    <main className="bg-white min-h-screen">
=======
  return (
    <main className="container py-6">
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
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
<<<<<<< HEAD

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
=======
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Subcategories sidebar */}
        {subcategories.length > 0 && (
          <aside className="w-full lg:w-64 shrink-0">
            <h2 className="font-semibold mb-3 text-lg">Subcategories</h2>
            <ul className="space-y-2">
              {subcategories.map((sub) => (
                <li key={sub.id}>
                  <a
                    href={`/category/${sub.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {sub.name}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        )}
        
        <div className="flex-1">
          <FiltersPanel basePath={`/category/${params.slug}`} sort={searchParams?.sort} min={searchParams?.min} max={searchParams?.max} />
          
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">{categoryTitle}</h1>
            <span className="text-sm text-muted-foreground">{total} products</span>
          </div>
          
          {products && products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p as Product} />
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {page > 1 && (
                    <a
                      href={`/category/${params.slug}?page=${page - 1}${searchParams?.sort ? `&sort=${searchParams.sort}` : ''}${searchParams?.min ? `&min=${searchParams.min}` : ''}${searchParams?.max ? `&max=${searchParams.max}` : ''}`}
                      className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Previous
                    </a>
                  )}
                  <span className="px-4 py-2">
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages && (
                    <a
                      href={`/category/${params.slug}?page=${page + 1}${searchParams?.sort ? `&sort=${searchParams.sort}` : ''}${searchParams?.min ? `&min=${searchParams.min}` : ''}${searchParams?.max ? `&max=${searchParams.max}` : ''}`}
                      className="px-4 py-2 border rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Next
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No products in this category yet.</p>
          )}
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
        </div>
      </div>
    </main>
  );
}
