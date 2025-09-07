import { getSupabaseAnonServer } from "@/lib/supabase-server";
import Link from "next/link";
import { type Route } from "next";

export default async function NavigationBar() {
  // Gracefully handle missing envs in Production to avoid SSR crashes.
  const hasSupabaseEnv = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabaseEnv) {
    return (
      <nav className="border-b bg-background shadow-sm">
        <div className="container flex items-center justify-center gap-6 py-2 text-sm font-medium text-muted-foreground" />
      </nav>
    );
  }

  let categories: string[] = [];
  try {
    const supabase = getSupabaseAnonServer();
    if (!supabase) {
      return (
        <nav className="border-b bg-background shadow-sm">
          <div className="container flex items-center justify-center gap-6 py-2 text-sm font-medium text-muted-foreground" />
        </nav>
      );
    }
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .or("is_active.is.null,is_active.eq.true");
    if (error) {
      console.error("NavigationBar: failed to fetch categories", error);
    } else if (data) {
      categories = [
        ...new Set((data as { category: string }[]).map((p) => p.category).filter(Boolean)),
      ];
    }
  } catch (e) {
    console.error("NavigationBar: init/fetch error", e);
  }

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
