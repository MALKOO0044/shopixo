import { MetadataRoute } from "next";
import { products } from "@/lib/products";

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://shopixo.example");

export default function sitemap(): MetadataRoute.Sitemap {
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
  const productEntries = products.map((p) => ({ url: `${baseUrl}/product/${p.slug}`, lastModified: now }));
  return [...staticEntries, ...productEntries];
}
