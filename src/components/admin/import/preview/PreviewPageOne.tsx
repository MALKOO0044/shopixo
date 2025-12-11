"use client";

import { Star, Image as ImageIcon, Tag, Ruler, FolderOpen, DollarSign, TrendingUp, Users } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageOneProps = {
  product: PricedProduct;
};

function PopularityIndicator({ listedNum, rating, reviewCount }: { listedNum?: number; rating?: number; reviewCount?: number }) {
  const hasRating = typeof rating === "number" && rating > 0;
  const hasListedNum = typeof listedNum === "number" && listedNum > 0;
  
  // Calculate popularity level based on listedNum
  const getPopularityLevel = (num: number): { label: string; color: string; stars: number } => {
    if (num >= 1000) return { label: "شائع جداً", color: "text-green-600 bg-green-50", stars: 5 };
    if (num >= 500) return { label: "شائع", color: "text-emerald-600 bg-emerald-50", stars: 4 };
    if (num >= 100) return { label: "جيد", color: "text-blue-600 bg-blue-50", stars: 3 };
    if (num >= 50) return { label: "متوسط", color: "text-amber-600 bg-amber-50", stars: 2 };
    return { label: "جديد", color: "text-gray-600 bg-gray-50", stars: 1 };
  };

  // If we have actual rating data from reviews, show stars
  if (hasRating) {
    const stars = Math.round(rating!);
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${
                  i <= stars
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-xl font-bold text-gray-800">{rating!.toFixed(1)}</span>
          {reviewCount !== undefined && reviewCount > 0 && (
            <span className="text-gray-500 text-sm">({reviewCount} تقييم)</span>
          )}
        </div>
      </div>
    );
  }

  // Show popularity based on listedNum (how many sellers list this product)
  if (hasListedNum) {
    const popularity = getPopularityLevel(listedNum!);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${popularity.color}`}>
            <TrendingUp className="h-5 w-5" />
            <span className="font-bold">{popularity.label}</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i <= popularity.stars
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Users className="h-4 w-4" />
          <span>{listedNum!.toLocaleString()} بائع يعرض هذا المنتج</span>
        </div>
      </div>
    );
  }

  // No data available
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
      <p className="text-gray-500 text-sm">لا توجد بيانات شعبية متاحة</p>
    </div>
  );
}

export default function PreviewPageOne({ product }: PreviewPageOneProps) {
  // Use availableSizes from API (extracted from variants) - these are the normalized sizes
  const uniqueSizes = product.availableSizes && product.availableSizes.length > 0
    ? product.availableSizes
    : [];

  const imageCount = product.images?.length || 0;
  
  // Debug logging
  console.log(`[PreviewPageOne] Product ${product.cjSku}: rating=${product.rating}, sizes=${uniqueSizes.join(',')}, availableSizes=${product.availableSizes?.join(',') || 'none'}`);

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4" dir="rtl">
      {/* Main Image Section */}
      <div className="lg:w-1/2 flex flex-col items-center">
        <div className="relative w-full max-w-md aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-md border border-gray-100">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt="صورة المنتج"
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
          <span className="font-medium">{imageCount} صور متاحة</span>
        </div>
      </div>

      {/* Product Details Section */}
      <div className="lg:w-1/2 space-y-8">
        
        {/* SKU */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <Tag className="h-5 w-5 text-blue-600" />
            <span className="text-gray-500 font-medium">رمز المنتج (SKU)</span>
          </div>
          <p className="font-mono text-2xl font-bold text-blue-700 bg-blue-50 px-4 py-3 rounded-lg">
            {product.cjSku}
          </p>
        </div>

        {/* Sizes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Ruler className="h-5 w-5 text-purple-600" />
            <span className="text-gray-500 font-medium">المقاسات المتاحة</span>
          </div>
          {uniqueSizes.length > 0 ? (
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
          ) : (
            <p className="text-gray-400 text-lg">مقاس واحد</p>
          )}
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <FolderOpen className="h-5 w-5 text-green-600" />
            <span className="text-gray-500 font-medium">الفئة</span>
          </div>
          <p className="text-lg text-gray-800 font-medium">
            {product.categoryName || "غير محدد"}
          </p>
        </div>

        {/* Popularity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <span className="text-gray-500 font-medium">الشعبية</span>
          </div>
          <PopularityIndicator listedNum={product.listedNum} rating={product.rating} reviewCount={product.reviewCount} />
        </div>

        {/* Price */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-gray-600 font-medium">السعر</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">نطاق السعر:</span>
              <span className="text-2xl font-bold text-green-700">
                {product.minPriceSAR.toFixed(0)} - {product.maxPriceSAR.toFixed(0)} ر.س
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-green-200 pt-3">
              <span className="text-gray-500">متوسط السعر:</span>
              <span className="text-xl font-semibold text-green-600">
                {product.avgPriceSAR.toFixed(0)} ر.س
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
