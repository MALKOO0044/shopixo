"use client";

import type { ReactNode } from "react";
import { Package, TrendingUp, Layers, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageFourProps = {
  product: PricedProduct;
};

function getStockStatus(stock: number): { label: string; color: string; icon: ReactNode } {
  if (stock === 0) {
    return {
      label: "نفذ من المخزون",
      color: "text-red-600 bg-red-50 border-red-200",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    };
  }
  if (stock < 10) {
    return {
      label: "مخزون منخفض",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    };
  }
  if (stock < 50) {
    return {
      label: "مخزون محدود",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: <Package className="h-5 w-5 text-blue-500" />,
    };
  }
  return {
    label: "متوفر بكثرة",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  };
}

function getPopularityLevel(listedNum: number): { label: string; level: number; color: string } {
  if (listedNum >= 1000) {
    return { label: "شائع جداً", level: 5, color: "bg-green-500" };
  }
  if (listedNum >= 500) {
    return { label: "شائع", level: 4, color: "bg-emerald-500" };
  }
  if (listedNum >= 100) {
    return { label: "متوسط الشعبية", level: 3, color: "bg-blue-500" };
  }
  if (listedNum >= 20) {
    return { label: "قليل الشعبية", level: 2, color: "bg-amber-500" };
  }
  return { label: "جديد", level: 1, color: "bg-gray-400" };
}

export default function PreviewPageFour({ product }: PreviewPageFourProps) {
  const stockStatus = getStockStatus(product.stock);
  const popularity = getPopularityLevel(product.listedNum);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid md:grid-cols-2 gap-5">
        <div className={`rounded-xl border p-5 ${stockStatus.color}`}>
          <div className="flex items-center gap-3 mb-4">
            {stockStatus.icon}
            <h3 className="text-lg font-bold">حالة المخزون</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">الكمية المتاحة:</span>
              <span className="text-2xl font-bold">{product.stock.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">الحالة:</span>
              <span className="font-semibold">{stockStatus.label}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900">المتغيرات</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">إجمالي المتغيرات:</span>
              <span className="text-2xl font-bold text-gray-900">{product.totalVariants}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">المتغيرات المتاحة:</span>
              <span className="font-semibold text-green-600">{product.successfulVariants}</span>
            </div>

            {product.totalVariants !== product.successfulVariants && (
              <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
                {product.totalVariants - product.successfulVariants} متغيرات غير متاحة للشحن
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-bold text-gray-900">الشعبية</h3>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">عدد المتاجر التي تبيع هذا المنتج:</span>
            <span className="text-xl font-bold text-gray-900">{product.listedNum.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">مستوى الشعبية:</span>
              <span className="font-semibold">{popularity.label}</span>
            </div>
            
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-2 flex-1 rounded-full ${
                    level <= popularity.level ? popularity.color : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            {popularity.level >= 4 ? (
              <>منتج شائع ومطلوب بكثرة. قد يكون هناك منافسة عالية.</>
            ) : popularity.level >= 2 ? (
              <>منتج متوسط الطلب. فرصة جيدة للدخول في السوق.</>
            ) : (
              <>منتج جديد أو قليل الطلب. قد يحتاج تسويق إضافي.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
