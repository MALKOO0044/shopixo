import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const baseUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const isProd = env === "production";
  if (!isProd) {
    return {
      rules: [
        { userAgent: "*", disallow: ["/"] },
      ],
      sitemap: `${baseUrl}/sitemap.xml`,
      host: baseUrl,
    };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/order-tracking", "/account"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
