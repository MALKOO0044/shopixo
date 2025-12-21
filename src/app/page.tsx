import type { Metadata } from "next";
import HeroBanners from "@/components/litb/HeroBanners";
import CategoryCircles from "@/components/litb/CategoryCircles";
import FlashSale from "@/components/litb/FlashSale";
import ProductCarousel from "@/components/litb/ProductCarousel";
import PromoBanners from "@/components/litb/PromoBanners";
import CategoryShowcase from "@/components/litb/CategoryShowcase";
import RecommendedProducts from "@/components/litb/RecommendedProducts";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "LightInTheBox - Global Online Shopping for Dresses, Home & Garden, Electronics",
  description: "Shop quality products at amazing prices with worldwide shipping. Discover fashion, home décor, electronics, and more.",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "LightInTheBox - Global Online Shopping",
    description: "Shop quality products at amazing prices with worldwide shipping.",
    siteName: "LightInTheBox",
  },
  twitter: {
    card: "summary_large_image",
    title: "LightInTheBox - Global Online Shopping",
    description: "Shop quality products at amazing prices with worldwide shipping.",
  },
  alternates: { canonical: "/" },
};

export const revalidate = 60;

const WARDROBE_PRODUCTS = [
  { id: 101, name: "Soft Cloud Leggings High Waist", price: 17.75, originalPrice: 26.63, rating: 4.9, image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200&h=200&fit=crop" },
  { id: 102, name: "Women's Orange Knit Sweater", price: 22.19, originalPrice: undefined, rating: 4.8, image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop" },
  { id: 103, name: "Cozy Winter Sweatshirt", price: 19.53, originalPrice: 29.30, rating: 4.7, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop" },
  { id: 104, name: "Classic Denim Jacket", price: 34.99, originalPrice: 59.99, rating: 4.9, image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=200&h=200&fit=crop" },
  { id: 105, name: "Casual Cotton T-Shirt", price: 12.99, originalPrice: 19.99, rating: 4.6, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop" },
  { id: 106, name: "Slim Fit Chinos", price: 28.50, originalPrice: 45.00, rating: 4.7, image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=200&h=200&fit=crop" },
];

const CLEARANCE_PRODUCTS = [
  { id: 201, name: "Women's Wide Leg Jumpsuit", price: 8.13, originalPrice: 14.79, rating: 4.8, image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200&h=200&fit=crop", badge: "CLEARANCE" },
  { id: 202, name: "Elegant Lace Midi Dress", price: 12.20, originalPrice: 40.59, rating: 4.6, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&h=200&fit=crop", badge: "CLEARANCE" },
  { id: 203, name: "Vintage Green Velvet Dress", price: 8.87, originalPrice: 14.85, rating: 4.5, image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=200&h=200&fit=crop", badge: "CLEARANCE" },
  { id: 204, name: "Floral Print Maxi Skirt", price: 15.99, originalPrice: 35.99, rating: 4.7, image: "https://images.unsplash.com/photo-1583496661160-fb5886a0uj37?w=200&h=200&fit=crop", badge: "CLEARANCE" },
  { id: 205, name: "Bohemian Embroidered Blouse", price: 9.99, originalPrice: 24.99, rating: 4.4, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&h=200&fit=crop", badge: "CLEARANCE" },
];

const ESPECIALLY_FOR_YOU = [
  { id: 301, name: "Kids Graphic T-Shirt", price: 9.42, originalPrice: 14.91, rating: 4.8, image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=200&h=200&fit=crop" },
  { id: 302, name: "Men's Quarter Zip Pullover", price: 20.19, originalPrice: 28.85, rating: 4.9, image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=200&h=200&fit=crop" },
  { id: 303, name: "Classic Blue Sweater", price: 17.31, originalPrice: 24.75, rating: 4.7, image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&h=200&fit=crop" },
  { id: 304, name: "Ice Age Fun Poster", price: 20.19, originalPrice: 27.51, rating: 4.5, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop" },
  { id: 305, name: "Kids Panda Hoodie", price: 9.62, originalPrice: 18.92, rating: 4.9, image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=200&h=200&fit=crop" },
  { id: 306, name: "Youth White Sweatshirt", price: 14.42, originalPrice: 24.51, rating: 4.6, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop" },
];

export default async function HomePage() {
  return (
    <main className="bg-white">
      <HeroBanners />
      <CategoryCircles />
      <FlashSale />
      <ProductCarousel 
        title="Wardrobe Must-Haves" 
        products={WARDROBE_PRODUCTS} 
        viewAllHref="/category/wardrobe"
      />
      <ProductCarousel 
        title="Clearance" 
        products={CLEARANCE_PRODUCTS} 
        viewAllHref="/clearance"
      />
      <PromoBanners />
      <CategoryShowcase />
      <ProductCarousel 
        title="Especially For You" 
        products={ESPECIALLY_FOR_YOU} 
        viewAllHref="/for-you"
      />
      <RecommendedProducts />
    </main>
  );
}
