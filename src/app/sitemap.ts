import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/site";

const baseUrl = getSiteUrl();

// Regenerate sitemap periodically to include new products
export const revalidate = 3600; // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/shop",
    "/about",
    "/contact",
    "/faq",
    "/privacy-policy",
    "/return-policy",
    "/terms",
    "/blog",
    "/search",
  ];
  const now = new Date();
  const staticEntries = staticPaths.map((path) => ({ url: `${baseUrl}${path}`, lastModified: now }));
  // Fetch dynamic product slugs using server-side Supabase anon client (no cookies)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let products: { slug: string; updated_at: string }[] | null = null;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Prefer active products; gracefully fallback if column is missing (pre-migration)
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at")
      .or("is_active.is.null,is_active.eq.true");
    if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
      const { data: fbData } = await supabase
        .from("products")
        .select("slug, updated_at");
      products = fbData as any;
    } else {
      products = data as any;
    }
  }

  const productEntries = products?.map(({ slug, updated_at }) => ({
    url: `${baseUrl}/product/${slug}`,
    lastModified: new Date(updated_at),
  })) ?? [];

  return [...staticEntries, ...productEntries];
}
