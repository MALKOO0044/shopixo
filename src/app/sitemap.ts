import { MetadataRoute } from "next";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://shopixo.example");

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
  // Fetch dynamic product slugs
  const supabase = createServerComponentClient({ cookies });
  const { data: products } = await supabase.from("products").select("slug, updated_at");

  const productEntries = products?.map(({ slug, updated_at }) => ({
    url: `${baseUrl}/product/${slug}`,
    lastModified: new Date(updated_at),
  })) ?? [];

  return [...staticEntries, ...productEntries];
}
