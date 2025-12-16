"use client";

import { Truck, Clock, DollarSign, CheckCircle, XCircle, MapPin, Timer, Package } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageFiveProps = {
  product: PricedProduct;
};

export default function PreviewPageFive({ product }: PreviewPageFiveProps) {
  const availableVariants = product.variants.filter((v) => v.shippingAvailable);
  const unavailableVariants = product.variants.filter((v) => !v.shippingAvailable);

  const minShipping = availableVariants.length > 0
    ? Math.min(...availableVariants.map((v) => v.shippingPriceSAR))
    : 0;
  const maxShipping = availableVariants.length > 0
    ? Math.max(...availableVariants.map((v) => v.shippingPriceSAR))
    : 0;

  const deliveryTimes = availableVariants
    .map((v) => v.deliveryDays)
    .filter((d) => d && d.trim() !== "");
  const uniqueDeliveryTimes = [...new Set(deliveryTimes)];

  const logisticNames = availableVariants
    .map((v) => v.logisticName)
    .filter((n): n is string => !!n && n.trim() !== "");
  const uniqueLogistics = [...new Set(logisticNames)];

  const availabilityRate = product.totalVariants > 0
    ? Math.round((availableVariants.length / product.totalVariants) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Processing Time Card */}
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
            <h3 className="text-lg font-bold text-green-900">Shipping Cost</h3>
          </div>

          {availableVariants.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-green-700">Minimum:</span>
                <span className="text-xl font-bold text-green-800">
                  ${minShipping.toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700">Maximum:</span>
                <span className="text-xl font-bold text-green-800">
                  ${maxShipping.toFixed(0)}
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
          <h3 className="text-lg font-bold text-gray-900">Shipping Provider</h3>
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
