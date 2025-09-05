import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://shopixo.example");

// Regenerate sitemap periodically to include new products
export const revalidate = 3600; // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/shop",
    "/cart",
    "/checkout",
    "/order-tracking",
    "/about",
    "/contact",
    "/faq",
    "/privacy-policy",
    "/return-policy",
    "/terms",
    "/blog",
    "/account",
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
    const { data } = await supabase.from("products").select("slug, updated_at").eq("is_active", true);
    products = data as any;
  }

  const productEntries = products?.map(({ slug, updated_at }) => ({
    url: `${baseUrl}/product/${slug}`,
    lastModified: new Date(updated_at),
  })) ?? [];

  return [...staticEntries, ...productEntries];
}
