"use client";

import { Star, TrendingUp, Image as ImageIcon, Tag, Ruler, FolderOpen, DollarSign, Info, Palette, Smartphone } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageOneProps = {
  product: PricedProduct;
};

function confidenceLabel(c?: number) {
  if (typeof c !== 'number') return 'unknown';
  if (c >= 0.75) return 'high';
  if (c >= 0.4) return 'medium';
  return 'low';
}

function getPopularityInfo(listedNum: number): { label: string; level: number; color: string; bgColor: string } {
  if (listedNum >= 1000) {
    return { label: "Very Popular", level: 5, color: "text-green-700", bgColor: "bg-green-100" };
  }
  if (listedNum >= 500) {
    return { label: "Popular", level: 4, color: "text-emerald-700", bgColor: "bg-emerald-100" };
  }
  if (listedNum >= 100) {
    return { label: "Moderate Popularity", level: 3, color: "text-blue-700", bgColor: "bg-blue-100" };
  }
  if (listedNum >= 20) {
    return { label: "Low Popularity", level: 2, color: "text-amber-700", bgColor: "bg-amber-100" };
  }
  return { label: "New", level: 1, color: "text-gray-700", bgColor: "bg-gray-100" };
}

function PopularityDisplay({ listedNum }: { listedNum: number }) {
  const info = getPopularityInfo(listedNum);
  
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className={`px-4 py-2 rounded-lg font-semibold ${info.bgColor} ${info.color}`}>
          {info.label}
        </span>
        <span className="text-xl font-bold text-gray-800">{listedNum.toLocaleString()}</span>
        <span className="text-gray-500 text-sm">times listed</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-2 w-8 rounded ${i <= info.level ? 'bg-amber-400' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function PreviewPageOne({ product }: PreviewPageOneProps) {
  const uniqueSizes = product.availableSizes && product.availableSizes.length > 0
    ? product.availableSizes
    : [];
  const uniqueColors = product.availableColors && product.availableColors.length > 0
    ? product.availableColors
    : [];
  const uniqueModels = product.availableModels && product.availableModels.length > 0
    ? product.availableModels
    : [];

  const imageCount = product.images?.length || 0;
  
  const displayedRating = product.displayedRating ?? 0;
  const ratingConfidence = product.ratingConfidence ?? null;

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4">
      {/* Main Image Section */}
      <div className="lg:w-1/2 flex flex-col items-center">
        <div className="relative w-full max-w-md aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-md border border-gray-100">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt="Product image"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder-product.png";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-20 w-20 text-gray-300" />
            </div>
          )}
        </div>
        
        {/* Image Count */}
        <div className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full">
          <ImageIcon className="h-5 w-5" />
          <span className="font-medium">{imageCount} images available</span>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="lg:w-1/2 space-y-8">
        
        {/* Rating - Internal Product Rating Engine */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <span className="text-gray-500 font-medium">Rating</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={`star-${i}`}
                  className={`h-6 w-6 ${i < Math.floor(displayedRating) ? 'fill-amber-400 text-amber-400' : (i < displayedRating ? 'fill-amber-300 text-amber-300' : 'text-gray-300')}`}
                />
              ))}
            </div>
            <span className="text-2xl font-bold text-gray-800">{displayedRating.toFixed(1)}</span>
            <span className="text-sm text-gray-500">{confidenceLabel(ratingConfidence ?? undefined)} confidence</span>
          </div>
        </div>

        {/* Popularity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-gray-500 font-medium">Popularity</span>
            <div className="group relative">
              <Info className="h-4 w-4 text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-sm rounded-lg shadow-lg z-10">
                Based on how many stores list this product on CJ Dropshipping
              </div>
            </div>
          </div>
          <PopularityDisplay listedNum={product.listedNum || 0} />
        </div>

        {/* SKU */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Tag className="h-5 w-5 text-blue-600" />
            <span className="text-gray-500 font-medium">Product SKU</span>
          </div>
          <p className="font-mono text-2xl font-bold text-blue-700 bg-blue-50 px-4 py-3 rounded-lg">
            {product.cjSku}
          </p>
        </div>

        {/* Colors */}
        {uniqueColors.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-pink-600" />
              <span className="text-gray-500 font-medium">Available Colors</span>
              <span className="text-sm text-gray-400">({uniqueColors.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {uniqueColors.map((color, idx) => (
                <span
                  key={idx}
                  className="bg-pink-50 text-pink-700 px-4 py-2 rounded-lg font-semibold text-lg border border-pink-200"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Compatible Devices/Models */}
        {uniqueModels.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span className="text-gray-500 font-medium">Compatible Devices</span>
              <span className="text-sm text-gray-400">({uniqueModels.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueModels.map((model, idx) => (
                <span
                  key={idx}
                  className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium text-sm border border-blue-200"
                >
                  {model}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sizes (for clothing/shoes) */}
        {uniqueSizes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Ruler className="h-5 w-5 text-purple-600" />
              <span className="text-gray-500 font-medium">Available Sizes</span>
              <span className="text-sm text-gray-400">({uniqueSizes.length})</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {uniqueSizes.map((size, idx) => (
                <span
                  key={idx}
                  className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-semibold text-lg border border-purple-200"
                >
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* No variants message */}
        {uniqueColors.length === 0 && uniqueModels.length === 0 && uniqueSizes.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Ruler className="h-5 w-5 text-purple-600" />
              <span className="text-gray-500 font-medium">Available Sizes</span>
            </div>
            <p className="text-gray-400 text-lg">One Size</p>
          </div>
        )}

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <FolderOpen className="h-5 w-5 text-green-600" />
            <span className="text-gray-500 font-medium">Category</span>
          </div>
          <p className="text-lg text-gray-800 font-medium">
            {product.categoryName || "Not specified"}
          </p>
        </div>

        {/* Price - Single Final Sell Price */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-gray-600 font-medium">Price</span>
          </div>
          {(() => {
            // Calculate final sell price from first available variant (highest shipping)
            const availableVariants = product.variants.filter(v => v.shippingAvailable);
            const firstVariant = availableVariants[0];
            
            if (firstVariant) {
              const productCostUSD = firstVariant.variantPriceUSD || 0;
              const shippingCostUSD = firstVariant.shippingPriceUSD || 0;
              const totalCostUSD = productCostUSD + shippingCostUSD;
              const profitMargin = 0.08;
              const sellPriceUSD = totalCostUSD / (1 - profitMargin);
              
              return (
                <div className="text-center py-2">
                  <span className="text-4xl font-bold text-green-700">
                    ${sellPriceUSD.toFixed(2)}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">
                    Final price (includes product, shipping & 8% margin)
                  </p>
                </div>
              );
            } else {
              return (
                <p className="text-gray-500 italic text-center">Price unavailable</p>
              );
            }
          })()}
        </div>

      </div>
    </div>
  );
}
