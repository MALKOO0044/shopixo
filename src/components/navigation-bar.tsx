import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { type Route } from "next";

export default async function NavigationBar() {
  // const supabase = createServerComponentClient({ cookies });
  // const { data: products }: { data: { category: string }[] | null } = await supabase.from("products").select("category");

  // Get unique categories
  // const categories = [...new Set(products?.map((p) => p.category) || [])];
  const categories: string[] = []; // Temporarily set to empty array

  return (
    <nav className="border-b bg-background shadow-sm">
      <div className="container flex items-center justify-center gap-6 py-2 text-sm font-medium text-muted-foreground">
        {categories.map((category) => (
          <Link 
            key={category} 
            href={`/category/${category.toLowerCase().replace(/ /g, "-")}` as Route}
            className="transition-colors hover:text-primary"
          >
            {category}
          </Link>
        ))}
      </div>
    </nav>
  );
}
