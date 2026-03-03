import type { Metadata } from "next";
import HeroBanners from "@/components/litb/HeroBanners";
import CategoryCircles from "@/components/litb/CategoryCircles";
import FlashSale from "@/components/litb/FlashSale";
import ProductCarousel from "@/components/litb/ProductCarousel";
import PromoBanners from "@/components/litb/PromoBanners";
import CategoryShowcase from "@/components/litb/CategoryShowcase";
import RecommendedProducts from "@/components/litb/RecommendedProducts";
import {
  getFlashSaleProducts,
  getNewArrivals,
  getBestSellers,
  getRecommendedProducts,
} from "@/lib/homepage-products";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Shopixo - Global Online Shopping for Fashion, Home & Electronics",
  description: "Shop quality products at amazing prices with worldwide shipping. Discover fashion, home décor, electronics, and more.",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Shopixo - Global Online Shopping",
    description: "Shop quality products at amazing prices with worldwide shipping.",
    siteName: "Shopixo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shopixo - Global Online Shopping",
    description: "Shop quality products at amazing prices with worldwide shipping.",
  },
  alternates: { canonical: "/" },
};

export const revalidate = 60;

export default async function HomePage() {
  const [flashSaleProducts, newArrivals, bestSellers, recommendedProducts] = await Promise.all([
    getFlashSaleProducts(8),
    getNewArrivals(6),
    getBestSellers(6),
    getRecommendedProducts(10),
  ]);

  return (
    <main className="bg-white">
      <HeroBanners />
      <CategoryCircles />
      <FlashSale products={flashSaleProducts} />
      <ProductCarousel 
        title="New Arrivals" 
        products={newArrivals} 
        viewAllHref="/new-arrivals"
      />
      <ProductCarousel 
        title="Best Sellers" 
        products={bestSellers} 
        viewAllHref="/bestsellers"
      />
      <PromoBanners />
      <CategoryShowcase />
      <RecommendedProducts products={recommendedProducts} />
    </main>
  );
}
