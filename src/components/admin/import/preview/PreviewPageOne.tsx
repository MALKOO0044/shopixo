"use client";

import { Star, Image as ImageIcon } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageOneProps = {
  product: PricedProduct;
};

function StarRating({ rating }: { rating?: number }) {
  const stars = rating ? Math.round(rating) : 0;
  const hasRating = typeof rating === "number" && rating > 0;

  if (!hasRating) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-4 w-4 text-gray-300" />
          ))}
        </div>
        <span className="text-sm">لا يوجد تقييم</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i <= stars ? "text-amber-400 fill-amber-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function PreviewPageOne({ product }: PreviewPageOneProps) {
  const hasDescription = product.description && product.description.trim().length > 0;
  const truncatedDescription = hasDescription
    ? product.description!.length > 300
      ? product.description!.slice(0, 300) + "..."
      : product.description
    : null;

  return (
    <div className="grid md:grid-cols-2 gap-6" dir="rtl">
      <div className="space-y-4">
        {product.images?.[0] ? (
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-lg">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder-product.png";
              }}
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-gray-300" />
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ImageIcon className="h-4 w-4" />
          <span>{product.images?.length || 0} صور متاحة</span>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 leading-relaxed">
            {product.name}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">رمز المورد:</span>
          <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {product.cjSku}
          </span>
        </div>

        <div>
          <StarRating rating={product.rating} />
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700 font-medium">نطاق السعر:</span>
            <span className="text-xl font-bold text-green-700">
              {product.minPriceSAR.toFixed(0)} - {product.maxPriceSAR.toFixed(0)} ر.س
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-green-200 pt-3">
            <span className="text-gray-600">متوسط السعر:</span>
            <span className="text-lg font-semibold text-green-800">
              {product.avgPriceSAR.toFixed(0)} ر.س
            </span>
          </div>
        </div>

        {hasDescription ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">وصف المنتج:</h4>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
              {truncatedDescription}
            </p>
            {product.description!.length > 300 && (
              <p className="text-xs text-blue-600">
                انتقل إلى صفحة المواصفات للوصف الكامل
              </p>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-400 italic">
              لا يوجد وصف متاح لهذا المنتج
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
