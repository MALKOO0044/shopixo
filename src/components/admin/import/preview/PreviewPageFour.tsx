"use client";

import type { ReactNode } from "react";
import { Package, TrendingUp, Layers, AlertTriangle, CheckCircle, XCircle, Warehouse, Factory } from "lucide-react";
import type { PricedProduct } from "./types";

type PreviewPageFourProps = {
  product: PricedProduct;
};

function getStockStatus(stock: number): { label: string; color: string; icon: ReactNode } {
  if (stock === 0) {
    return {
      label: "Out of Stock",
      color: "text-red-600 bg-red-50 border-red-200",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
    };
  }
  if (stock < 10) {
    return {
      label: "Low Stock",
      color: "text-amber-600 bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    };
  }
  if (stock < 50) {
    return {
      label: "Limited Stock",
      color: "text-blue-600 bg-blue-50 border-blue-200",
      icon: <Package className="h-5 w-5 text-blue-500" />,
    };
  }
  return {
    label: "In Stock",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
  };
}

function getPopularityLevel(listedNum: number): { label: string; level: number; color: string } {
  if (listedNum >= 1000) {
    return { label: "Very Popular", level: 5, color: "bg-green-500" };
  }
  if (listedNum >= 500) {
    return { label: "Popular", level: 4, color: "bg-emerald-500" };
  }
  if (listedNum >= 100) {
    return { label: "Moderate Popularity", level: 3, color: "bg-blue-500" };
  }
  if (listedNum >= 20) {
    return { label: "Low Popularity", level: 2, color: "bg-amber-500" };
  }
  return { label: "New", level: 1, color: "bg-gray-400" };
}

export default function PreviewPageFour({ product }: PreviewPageFourProps) {
  // Use real inventory data if available, fallback to old stock field
  const realInventory = product.inventory;
  const totalStock = realInventory?.totalAvailable ?? product.stock;
  const stockStatus = getStockStatus(totalStock);
  const popularity = getPopularityLevel(product.listedNum);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-5">
        <div className={`rounded-xl border p-5 ${stockStatus.color}`}>
          <div className="flex items-center gap-3 mb-4">
            {stockStatus.icon}
            <h3 className="text-lg font-bold">Stock Status</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Available:</span>
              <span className="text-2xl font-bold">{totalStock.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold">{stockStatus.label}</span>
            </div>
            
            {realInventory && (
              <>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Warehouse className="h-4 w-4" /> CJ Warehouse:
                    </span>
                    <span className="font-semibold text-blue-600">{realInventory.totalCJ.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Factory className="h-4 w-4" /> Factory/Supplier:
                    </span>
                    <span className="font-semibold text-orange-600">{realInventory.totalFactory.toLocaleString()}</span>
                  </div>
                </div>
                
                {realInventory.warehouses && realInventory.warehouses.length > 0 && (
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <span className="text-xs text-gray-500 block mb-2">Stock by Warehouse:</span>
                    <div className="space-y-1">
                      {realInventory.warehouses.map((wh, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600">{wh.areaName} ({wh.countryCode})</span>
                          <span className="font-medium">{wh.totalInventory.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            
            {!realInventory && product.stock === 0 && (
              <div className="text-xs text-gray-400 italic mt-2">
                Inventory data unavailable from CJ API
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <Layers className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-900">Variants</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Variants:</span>
              <span className="text-2xl font-bold text-gray-900">{product.totalVariants}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Available Variants:</span>
              <span className="font-semibold text-green-600">{product.successfulVariants}</span>
            </div>

            {product.totalVariants !== product.successfulVariants && (
              <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
                {product.totalVariants - product.successfulVariants} variants unavailable for shipping
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <TrendingUp className="h-5 w-5 text-purple-500" />
          <h3 className="text-lg font-bold text-gray-900">Popularity</h3>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Number of stores selling this product:</span>
            <span className="text-xl font-bold text-gray-900">{product.listedNum.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Popularity Level:</span>
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
              <>Popular and in high demand. There may be high competition.</>
            ) : popularity.level >= 2 ? (
              <>Moderate demand. Good opportunity to enter the market.</>
            ) : (
              <>New or low demand product. May need additional marketing.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
