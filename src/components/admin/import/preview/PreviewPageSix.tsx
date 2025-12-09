"use client";

import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageSixProps = {
  product: PricedProduct;
};

export default function PreviewPageSix({ product }: PreviewPageSixProps) {
  const availableVariants = product.variants.filter((v) => v.shippingAvailable);
  const unavailableVariants = product.variants.filter((v) => !v.shippingAvailable);

  const avgProfit = availableVariants.length > 0
    ? availableVariants.reduce((sum, v) => sum + v.profitSAR, 0) / availableVariants.length
    : 0;

  const avgMarginPercent = availableVariants.length > 0
    ? availableVariants.reduce((sum, v) => {
        const margin = v.sellPriceSAR > 0 ? (v.profitSAR / v.sellPriceSAR) * 100 : 0;
        return sum + margin;
      }, 0) / availableVariants.length
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">متوسط الربح</h3>
          </div>
          <p className="text-3xl font-bold text-green-700">
            {avgProfit.toFixed(0)} ر.س
          </p>
          <p className="text-sm text-green-600 mt-1">لكل منتج مباع</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">متوسط هامش الربح</h3>
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {avgMarginPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-blue-600 mt-1">من سعر البيع</p>
        </div>
      </div>

      {availableVariants.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              تفاصيل الأسعار لكل متغير ({availableVariants.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">رمز المتغير</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">التكلفة (USD)</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">الشحن (SAR)</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">إجمالي التكلفة</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">سعر البيع</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">الربح</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">الهامش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {availableVariants.map((variant, idx) => {
                  const marginPercent = variant.sellPriceSAR > 0
                    ? (variant.profitSAR / variant.sellPriceSAR) * 100
                    : 0;
                  
                  return (
                    <tr key={variant.variantId || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {variant.variantSku || `VAR-${idx + 1}`}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        ${variant.variantPriceUSD.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {variant.shippingPriceSAR.toFixed(0)} ر.س
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {variant.totalCostSAR.toFixed(0)} ر.س
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">
                        {variant.sellPriceSAR.toFixed(0)} ر.س
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        {variant.profitSAR.toFixed(0)} ر.س
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          marginPercent >= 30 ? "text-green-600" :
                          marginPercent >= 20 ? "text-blue-600" :
                          marginPercent >= 10 ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {marginPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unavailableVariants.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">
              متغيرات غير متاحة للشحن ({unavailableVariants.length})
            </h3>
          </div>
          
          <div className="space-y-2">
            {unavailableVariants.slice(0, 5).map((variant, idx) => (
              <div
                key={variant.variantId || idx}
                className="bg-white/70 rounded-lg px-4 py-2 text-sm"
              >
                <span className="font-mono text-red-700">
                  {variant.variantSku || `VAR-${idx + 1}`}
                </span>
                {variant.error && (
                  <span className="text-red-600 mr-2">- {variant.error}</span>
                )}
              </div>
            ))}
            {unavailableVariants.length > 5 && (
              <p className="text-sm text-red-600 italic">
                و {unavailableVariants.length - 5} متغيرات أخرى...
              </p>
            )}
          </div>
        </div>
      )}

      {availableVariants.length === 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-amber-900 mb-2">
            لا توجد متغيرات متاحة للشحن
          </h3>
          <p className="text-amber-700">
            جميع متغيرات هذا المنتج غير متاحة للشحن إلى السعودية حالياً.
          </p>
        </div>
      )}
    </div>
  );
}
