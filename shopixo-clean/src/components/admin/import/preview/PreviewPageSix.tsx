"use client";

import { DollarSign, TrendingUp, AlertCircle, Truck, Package } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageSixProps = {
  product: PricedProduct;
  profitMargin: number;
};

export default function PreviewPageSix({ product, profitMargin }: PreviewPageSixProps) {
  const availableVariants = product.variants.filter((v) => v.shippingAvailable);
  const unavailableVariants = product.variants.filter((v) => !v.shippingAvailable);

  const margin = profitMargin / 100;

  const computedVariants = availableVariants.map(v => {
    const productCost = v.variantPriceUSD;
    const shippingCost = v.shippingPriceUSD;
    const totalCost = productCost + shippingCost;
    const sellPrice = totalCost / (1 - margin);
    const profit = sellPrice - totalCost;
    const marginPercent = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;
    return { ...v, productCost, shippingCost, totalCost, sellPrice, profit, marginPercent };
  });

  const avgProfit = computedVariants.length > 0
    ? computedVariants.reduce((sum, v) => sum + v.profit, 0) / computedVariants.length
    : 0;

  const avgMarginPercent = computedVariants.length > 0
    ? computedVariants.reduce((sum, v) => sum + v.marginPercent, 0) / computedVariants.length
    : 0;

  const totalProductCost = computedVariants.reduce((sum, v) => sum + v.productCost, 0);
  const totalShippingCost = computedVariants.reduce((sum, v) => sum + v.shippingCost, 0);
  const totalRevenue = computedVariants.reduce((sum, v) => sum + v.sellPrice, 0);
  const totalProfit = computedVariants.reduce((sum, v) => sum + v.profit, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-700">Total Product Cost</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            ${totalProductCost.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-purple-700">Total Shipping</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            ${totalShippingCost.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-orange-700">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">
            ${totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-700">Total Profit</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            ${totalProfit.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Average Profit</h3>
          </div>
          <p className="text-3xl font-bold text-green-700">
            ${avgProfit.toFixed(2)}
          </p>
          <p className="text-sm text-green-600 mt-1">per variant sold</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">Average Profit Margin</h3>
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {avgMarginPercent.toFixed(1)}%
          </p>
          <p className="text-sm text-blue-600 mt-1">of selling price</p>
        </div>
      </div>

      {computedVariants.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              Detailed Pricing per Variant ({computedVariants.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Variant</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Product Cost</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Shipping</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Total Cost</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Sell Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Profit</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Margin</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Shipping Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {computedVariants.slice(0, 20).map((variant, idx) => {
                  const variantLabel = variant.variantName || variant.size || variant.color || variant.variantSku || `Variant ${idx + 1}`;
                  
                  return (
                    <tr key={variant.variantId || idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {variant.variantImage && (
                            <img 
                              src={variant.variantImage} 
                              alt={variantLabel}
                              className="w-8 h-8 object-cover rounded"
                            />
                          )}
                          <span className="text-gray-700 font-medium truncate max-w-[120px]" title={variantLabel}>
                            {variantLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        ${variant.productCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-medium">
                        ${variant.shippingCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-medium text-orange-600">
                        ${variant.totalCost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">
                        ${variant.sellPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-600">
                        ${variant.profit.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          variant.marginPercent >= 30 ? "text-green-600" :
                          variant.marginPercent >= 20 ? "text-blue-600" :
                          variant.marginPercent >= 10 ? "text-amber-600" :
                          "text-red-600"
                        }`}>
                          {variant.marginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Truck className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate max-w-[80px]" title={variant.logisticName || 'N/A'}>
                            {variant.logisticName || 'N/A'}
                          </span>
                        </div>
                        {variant.deliveryDays && variant.deliveryDays !== 'Unknown' && (
                          <span className="text-xs text-gray-400 block">{variant.deliveryDays}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {computedVariants.length > 20 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center text-sm text-gray-500">
                Showing 20 of {computedVariants.length} variants
              </div>
            )}
          </div>
        </div>
      )}

      {unavailableVariants.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-bold text-red-900">
              Variants Unavailable for Shipping ({unavailableVariants.length})
            </h3>
          </div>
          
          <div className="space-y-2">
            {unavailableVariants.slice(0, 5).map((variant, idx) => (
              <div
                key={variant.variantId || idx}
                className="bg-white/70 rounded-lg px-4 py-2 text-sm"
              >
                <span className="font-medium text-red-700">
                  {variant.variantName || variant.size || variant.color || variant.variantSku || `Variant ${idx + 1}`}
                </span>
                {variant.error && (
                  <span className="text-red-600 ml-2">- {variant.error}</span>
                )}
              </div>
            ))}
            {unavailableVariants.length > 5 && (
              <p className="text-sm text-red-600 italic">
                and {unavailableVariants.length - 5} more variants...
              </p>
            )}
          </div>
        </div>
      )}

      {availableVariants.length === 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-amber-900 mb-2">
            No Variants Available for Shipping
          </h3>
          <p className="text-amber-700">
            All variants of this product are currently unavailable for shipping to the USA.
          </p>
        </div>
      )}
    </div>
  );
}
