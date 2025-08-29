import ProductCard from "@/components/product-card";
import { products } from "@/lib/products";

export const metadata = { title: "Shop", description: "Browse categories and trending products" };

export default function ShopPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Shop</h1>
      <p className="mt-2 text-slate-600">Explore our curated selection of trending products.</p>
      <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
