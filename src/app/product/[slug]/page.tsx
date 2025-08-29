import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";
import AddToCart from "@/components/add-to-cart";
import Ratings from "@/components/ratings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  if (!product) return { title: "Product not found" };
  const url = `${siteUrl}/product/${product.slug}`;
  const image = product.images?.[0] ? `${siteUrl}${product.images[0]}` : undefined;
  return {
    title: product.title,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "product",
      url,
      title: product.title,
      description: product.description,
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description,
      images: image ? [image] : undefined,
    },
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  if (!product) return notFound();
  const imagesFull = product.images.map((src) => `${siteUrl}${src}`);
  const productUrl = `${siteUrl}/product/${product.slug}`;
  return (
    <div className="container py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
              { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
              { "@type": "ListItem", position: 3, name: product.title, item: productUrl },
            ],
          }),
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
        <a href="/" className="hover:underline">Home</a>
        <span className="mx-2">/</span>
        <a href="/shop" className="hover:underline">Shop</a>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{product.title}</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            image: imagesFull,
            description: product.description,
            category: product.category,
            brand: { "@type": "Brand", name: "Shopixo" },
            offers: {
              "@type": "Offer",
              priceCurrency: "USD",
              price: product.price,
              availability: "https://schema.org/InStock",
              url: productUrl,
            },
          }),
        }}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
            <Image src={product.images[0]} alt={product.title} fill className="object-cover" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{product.title}</h1>
          <div className="mt-2 flex items-center gap-4">
            <div className="text-2xl font-semibold">{formatCurrency(product.price)}</div>
            <Ratings value={product.rating} />
          </div>
          <p className="mt-4 text-slate-700">{product.description}</p>
          {product.variants?.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {product.variants.map((v) => (
                <label key={v.name} className="block text-sm">
                  <div className="mb-1 font-medium">{v.name}</div>
                  <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30">
                    {v.options.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          <AddToCart id={product.slug} title={product.title} price={product.price} image={product.images[0]} />
          <div className="mt-8 text-sm text-slate-600">
            <p>• Free shipping on orders over $100</p>
            <p>• 30-day money-back guarantee</p>
            <p>• Secure checkout via Stripe & PayPal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
