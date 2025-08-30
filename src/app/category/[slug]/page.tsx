import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";

// Helper function to format slug back to title
function slugToTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const categoryTitle = slugToTitle(params.slug);

  const { data: products } = await supabase
    .from("products")
    .select<"*", Product>("*")
    .eq("category", categoryTitle);

  if (!products || products.length === 0) {
    // Even if no products, we can show the category page with a message
    // notFound(); // Optionally, uncomment if you want to show a 404 page
  }

  return (
    <main className="container py-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{categoryTitle}</h1>
      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p as Product} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No products found in this category.</p>
      )}
    </main>
  );
}
