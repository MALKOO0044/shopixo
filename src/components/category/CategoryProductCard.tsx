"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface CategoryProduct {
  id: number;
  title?: string;
  name?: string;
  slug: string;
  description?: string;
  price: number;
  images?: string[];
  image?: string;
  category?: string;
  rating?: number;
  stock?: number | null;
  variants?: any;
  available_colors?: string[];
  original_price?: number;
  msrp?: number;
  badge?: string;
}

interface CategoryProductCardProps {
  product: CategoryProduct;
  onAddToCart?: (product: CategoryProduct) => void;
}

function safeImageUrl(img: string | string[] | undefined | null): string {
  if (!img) return '/placeholder-product.png';
  if (Array.isArray(img)) {
    return img.length > 0 ? safeImageUrl(img[0]) : '/placeholder-product.png';
  }
  const s = img.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
        return parsed[0];
      }
    } catch {}
  }
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) {
    return s;
  }
  return '/placeholder-product.png';
}

function parseColors(product: CategoryProduct): string[] {
  if (product.available_colors && Array.isArray(product.available_colors)) {
    return product.available_colors.slice(0, 4);
  }
  if (product.variants && typeof product.variants === 'object') {
    try {
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const colors = new Set<string>();
      variants.forEach((v: any) => {
        if (v.color) colors.add(v.color);
      });
      return Array.from(colors).slice(0, 4);
    } catch {}
  }
  return [];
}

function getColorBackground(color: string): string {
  const colorMap: Record<string, string> = {
    "black": "#000000",
    "white": "#FFFFFF",
    "red": "#EF4444",
    "blue": "#3B82F6",
    "green": "#22C55E",
    "yellow": "#EAB308",
    "pink": "#EC4899",
    "purple": "#A855F7",
    "orange": "#F97316",
    "gray": "#6B7280",
    "grey": "#6B7280",
    "brown": "#92400E",
    "navy": "#1E3A8A",
    "beige": "#D4C4A8",
    "gold": "#CA8A04",
    "silver": "#9CA3AF",
  };
  const normalizedColor = color.toLowerCase().trim();
  return colorMap[normalizedColor] || "#9CA3AF";
}

export default function CategoryProductCard({ product, onAddToCart }: CategoryProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = parseColors(product);
  const imageUrl = safeImageUrl(product.images || product.image);
  
  const productName = product.title || product.name || "Product";
  const rating = (product as any).displayed_rating ?? 0;
  const originalPrice = product.original_price || product.msrp;
  const hasDiscount = originalPrice && originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round((1 - product.price / originalPrice) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const categoryPath = product.category || "";
  const categoryParts = categoryPath.split(">").map((p) => p.trim()).filter(Boolean);

  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      className="group bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] bg-gray-50">
        <Image
          src={imageUrl}
          alt={productName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {hasDiscount && discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-[#e31e24] text-white text-xs font-semibold px-2 py-1 rounded">
            -{discountPercent}%
          </span>
        )}
        
        {product.badge && !hasDiscount && (
          <span className="absolute top-2 left-2 bg-[#e31e24] text-white text-xs font-semibold px-2 py-1 rounded">
            {product.badge}
          </span>
        )}

        <div className={`absolute inset-x-0 bottom-0 bg-black/70 text-white text-center py-2.5 text-sm font-medium transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          QUICK SHOP
        </div>

        <button
          onClick={handleAddToCart}
          className={`absolute right-2 bottom-14 w-9 h-9 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-all ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          aria-label="Add to cart"
        >
          <ShoppingCart className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      <div className="p-3">
        {colors.length > 0 && (
          <div className="flex gap-1.5 mb-2">
            {colors.map((color, i) => (
              <span
                key={i}
                className="w-5 h-5 rounded-full border border-gray-200"
                style={{ backgroundColor: getColorBackground(color) }}
                title={color}
              />
            ))}
            {colors.length >= 4 && (
              <span className="text-xs text-gray-400 self-center ml-1">+</span>
            )}
          </div>
        )}

        <h3 className="text-sm text-gray-800 line-clamp-2 mb-1.5 min-h-[2.5rem]">
          {productName}
        </h3>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-gray-900 font-bold">${product.price.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
          )}
        </div>

        {categoryParts.length > 0 && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-1.5">
            {categoryParts.join(" > ")}
          </p>
        )}

        {rating > 0 && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-200 text-gray-200"
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
