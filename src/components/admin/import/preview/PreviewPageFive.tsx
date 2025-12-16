"use client";

import { Truck, Clock, DollarSign, CheckCircle, XCircle, MapPin, Timer, Package, TrendingUp } from "lucide-react";
import type { PricedProduct, ShippingOption } from "./types";

type PreviewPageFiveProps = {
  product: PricedProduct;
};

export default function PreviewPageFive({ product }: PreviewPageFiveProps) {
  const availableVariants = product.variants.filter((v) => v.shippingAvailable);
  const unavailableVariants = product.variants.filter((v) => !v.shippingAvailable);

  const minShipping = availableVariants.length > 0
    ? Math.min(...availableVariants.map((v) => v.shippingPriceUSD))
    : 0;
  const maxShipping = availableVariants.length > 0
    ? Math.max(...availableVariants.map((v) => v.shippingPriceUSD))
    : 0;

  const deliveryTimes = availableVariants
    .map((v) => v.deliveryDays)
    .filter((d) => d && d.trim() !== "" && d !== "Unknown");
  const uniqueDeliveryTimes = [...new Set(deliveryTimes)];

  const logisticNames = availableVariants
    .map((v) => v.logisticName)
    .filter((n): n is string => !!n && n.trim() !== "");
  const uniqueLogistics = [...new Set(logisticNames)];

  const availabilityRate = product.totalVariants > 0
    ? Math.round((availableVariants.length / product.totalVariants) * 100)
    : 0;

  const allShippingOptions: ShippingOption[] = [];
  const seenOptions = new Set<string>();
  for (const v of availableVariants) {
    if (v.allShippingOptions) {
      for (const opt of v.allShippingOptions) {
        const key = `${opt.name}-${opt.priceUSD}`;
        if (!seenOptions.has(key)) {
          seenOptions.add(key);
          allShippingOptions.push(opt);
        }
      }
    }
  }
  allShippingOptions.sort((a, b) => a.priceUSD - b.priceUSD);

  const firstVariant = availableVariants[0];
  const productCostUSD = firstVariant?.variantPriceUSD || 0;
  const shippingCostUSD = firstVariant?.shippingPriceUSD || 0;
  const totalCostUSD = productCostUSD + shippingCostUSD;
  const profitMargin = 0.08;
  const sellPriceUSD = totalCostUSD / (1 - profitMargin);
  const profitUSD = sellPriceUSD - totalCostUSD;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="h-5 w-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-indigo-900">Price Breakdown (Selected Shipping)</h3>
        </div>
        
        {firstVariant ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <span className="text-xs text-gray-500 block mb-1">Product Cost</span>
                <span className="text-2xl font-bold text-gray-800">${productCostUSD.toFixed(2)}</span>
              </div>
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <span className="text-xs text-gray-500 block mb-1">Shipping Cost</span>
                <span className="text-2xl font-bold text-blue-600">${shippingCostUSD.toFixed(2)}</span>
              </div>
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <span className="text-xs text-gray-500 block mb-1">Total Cost</span>
                <span className="text-2xl font-bold text-orange-600">${totalCostUSD.toFixed(2)}</span>
              </div>
              <div className="bg-white/70 rounded-lg p-4 text-center">
                <span className="text-xs text-gray-500 block mb-1">Sell Price</span>
                <span className="text-2xl font-bold text-green-600">${sellPriceUSD.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-green-100 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">Your Profit (8% margin)</span>
              </div>
              <span className="text-3xl font-bold text-green-700">${profitUSD.toFixed(2)}</span>
            </div>
            
            {firstVariant.logisticName && (
              <div className="text-sm text-indigo-600 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Selected: {firstVariant.logisticName} ({firstVariant.deliveryDays})</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-indigo-600 italic">No pricing data available</p>
        )}
      </div>

      {allShippingOptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">All Available Shipping Methods to USA</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Shipping Method</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Delivery Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Shipping Cost</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Total w/ Shipping</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Est. Sell Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allShippingOptions.slice(0, 10).map((opt, idx) => {
                  const totalWithShipping = productCostUSD + opt.priceUSD;
                  const estimatedSellPrice = totalWithShipping / (1 - 0.08);
                  const isCheapest = idx === 0;
                  
                  return (
                    <tr key={idx} className={`hover:bg-gray-50 ${isCheapest ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{opt.name}</span>
                          {isCheapest && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Cheapest</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{opt.deliveryDays}</td>
                      <td className="px-4 py-3 font-medium text-blue-600">${opt.priceUSD.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium text-orange-600">${totalWithShipping.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold text-green-600">${estimatedSellPrice.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(product.estimatedProcessingDays || product.estimatedDeliveryDays) && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Timer className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-bold text-amber-900">Processing & Handling Time</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {product.estimatedProcessingDays && (
              <div className="bg-white/70 rounded-lg px-4 py-3">
                <span className="text-sm text-amber-700 block mb-1">Processing Time</span>
                <span className="text-lg font-bold text-amber-800">{product.estimatedProcessingDays}</span>
              </div>
            )}
            {product.estimatedDeliveryDays && (
              <div className="bg-white/70 rounded-lg px-4 py-3">
                <span className="text-sm text-amber-700 block mb-1">Delivery Cycle</span>
                <span className="text-lg font-bold text-amber-800">{product.estimatedDeliveryDays}</span>
              </div>
            )}
          </div>
          {product.originCountry && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700">
              <Package className="h-4 w-4" />
              <span>Origin Country: {product.originCountry}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-blue-900">Delivery Time</h3>
          </div>

          {uniqueDeliveryTimes.length > 0 ? (
            <div className="space-y-2">
              {uniqueDeliveryTimes.map((time, idx) => (
                <div
                  key={idx}
                  className="bg-white/70 rounded-lg px-4 py-2 text-blue-800 font-medium"
                >
                  {time}
                </div>
              ))}
            </div>
          ) : product.estimatedDeliveryDays ? (
            <div className="bg-white/70 rounded-lg px-4 py-2 text-blue-800 font-medium">
              {product.estimatedDeliveryDays}
            </div>
          ) : (
            <p className="text-blue-600 italic">Not specified</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Shipping Cost Range</h3>
          </div>

          {availableVariants.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-green-700">Minimum:</span>
                <span className="text-xl font-bold text-green-800">
                  ${minShipping.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700">Maximum:</span>
                <span className="text-xl font-bold text-green-800">
                  ${maxShipping.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-green-600 italic">No shipping options available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <Truck className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-bold text-gray-900">Selected Shipping Provider</h3>
        </div>

        {uniqueLogistics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueLogistics.map((name, idx) => (
              <span
                key={idx}
                className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-medium border border-purple-200"
              >
                {name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">Not specified</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <MapPin className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold text-gray-900">Shipping Availability to USA</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Availability Rate:</span>
            <span className="text-2xl font-bold text-gray-900">{availabilityRate}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                availabilityRate === 100
                  ? "bg-green-500"
                  : availabilityRate >= 50
                  ? "bg-blue-500"
                  : availabilityRate > 0
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${availabilityRate}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Available for Shipping</span>
              </div>
              <span className="text-2xl font-bold text-green-800">
                {availableVariants.length}
              </span>
              <span className="text-sm text-green-600 ml-1">variants</span>
            </div>

            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">Not Available</span>
              </div>
              <span className="text-2xl font-bold text-red-800">
                {unavailableVariants.length}
              </span>
              <span className="text-sm text-red-600 ml-1">variants</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
