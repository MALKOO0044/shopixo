"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ConnectionStatus = {
  ok: boolean;
  message: string;
  responseTime?: number;
  categoriesCount?: number;
};

type Category = {
  id: string;
  name: string;
  fullPath: string;
  level1: string;
  level2: string;
  level3: string;
};

type PricingBreakdown = {
  cjPriceUSD: number;
  shippingUSD: number;
  totalCostUSD: number;
  totalCostSAR: number;
  vatAmount: number;
  paymentFeeAmount: number;
  profitAmount: number;
  rawTotal: number;
  roundedTotal: number;
};

type ProductResult = {
  id: string;
  nameEn: string;
  sku: string;
  bigImage: string;
  sellPrice: string;
  nowPrice?: string;
  discountPrice?: string;
  listedNum: number;
  categoryId: string;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  warehouseInventoryNum: number;
  description?: string;
  deliveryCycle?: string;
  shippingUSD: number;
  shippingDays: string;
  pricing: {
    baseCostUSD: number;
    baseCostSAR: number;
    vatSAR: number;
    paymentFeeSAR: number;
    profitSAR: number;
    finalPriceSAR: number;
    roundedPriceSAR: number;
    actualMarginPercent: number;
    breakdown: PricingBreakdown;
    needsReview: boolean;
    reviewReason?: string;
  };
};

export default function CJImportPage() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minStock, setMinStock] = useState(10);
  const [quantity, setQuantity] = useState(50);
  const [marginPercent, setMarginPercent] = useState(50);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);

  const [searching, setSearching] = useState(false);
  const [products, setProducts] = useState<ProductResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  async function addToQueue() {
    if (selectedProducts.size === 0) return;
    
    setAddingToQueue(true);
    setError(null);
    setQueueSuccess(null);
    
    try {
      const selectedItems = products.filter(p => selectedProducts.has(p.id));
      
      const res = await fetch("/api/admin/cj/v2/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: selectedItems,
          batchName: `${keyword || "CJ Products"} - ${new Date().toLocaleDateString()}`,
        }),
      });
      
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      setQueueSuccess(`Added ${data.addedCount} products to "${data.batchName}". Go to Review Queue to approve them.`);
      setSelectedProducts(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add to queue");
    } finally {
      setAddingToQueue(false);
    }
  }

  async function checkConnection() {
    setLoadingConnection(true);
    try {
      const res = await fetch("/api/admin/cj/v2/connection");
      const data = await res.json();
      setConnectionStatus(data);
    } catch (e) {
      setConnectionStatus({
        ok: false,
        message: e instanceof Error ? e.message : "Connection check failed",
      });
    } finally {
      setLoadingConnection(false);
    }
  }

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/admin/cj/v2/categories");
      const data = await res.json();
      if (data.ok) {
        setCategories(data.flat || []);
      }
    } catch (e) {
      console.error("Failed to load categories:", e);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function searchProducts() {
    setSearching(true);
    setError(null);
    setProducts([]);
    setSelectedProducts(new Set());

    try {
      const res = await fetch("/api/admin/cj/v2/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword || undefined,
          categoryId: selectedCategory || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          minStock,
          quantity,
          marginPercent,
          freeShippingOnly,
          pageSize: Math.min(quantity, 100),
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Search failed");
      }

      setProducts(data.products || []);
      setTotalFound(data.totalFound || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function toggleProduct(id: string) {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedProducts(new Set(products.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedProducts(new Set());
  }

  const selectedCount = selectedProducts.size;
  const needsReviewCount = products.filter((p) => p.pricing.needsReview).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CJ Product Import</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cj/finder"
            className="text-sm text-blue-600 hover:underline"
          >
            Old Finder
          </Link>
          <Link
            href="/admin/cj"
            className="text-sm text-blue-600 hover:underline"
          >
            CJ Dashboard
          </Link>
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                loadingConnection
                  ? "bg-yellow-400 animate-pulse"
                  : connectionStatus?.ok
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />
            <span className="font-medium">CJ Dropshipping API</span>
          </div>
          <div className="flex items-center gap-3">
            {connectionStatus?.responseTime && (
              <span className="text-sm text-gray-500">
                {connectionStatus.responseTime}ms
              </span>
            )}
            <button
              onClick={checkConnection}
              disabled={loadingConnection}
              className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
            >
              Test Connection
            </button>
          </div>
        </div>
        {connectionStatus && (
          <p
            className={`mt-2 text-sm ${
              connectionStatus.ok ? "text-green-600" : "text-red-600"
            }`}
          >
            {connectionStatus.message}
          </p>
        )}
      </div>

      {/* Search Filters */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <h2 className="font-semibold text-lg">Search Products</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keyword
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., women blouse, men shirt"
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 rounded border px-3 py-2"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.fullPath}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <button
                  onClick={loadCategories}
                  disabled={loadingCategories}
                  className="rounded bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700"
                >
                  {loadingCategories ? "..." : "Load"}
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity to Find
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              min={1}
              max={500}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Price (USD)
            </label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) =>
                setMinPrice(e.target.value ? parseFloat(e.target.value) : "")
              }
              placeholder="0"
              min={0}
              step={0.01}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Price (USD)
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value ? parseFloat(e.target.value) : "")
              }
              placeholder="100"
              min={0}
              step={0.01}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Stock
            </label>
            <input
              type="number"
              value={minStock}
              onChange={(e) =>
                setMinStock(Math.max(0, parseInt(e.target.value) || 0))
              }
              min={0}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profit Margin %
            </label>
            <input
              type="number"
              value={marginPercent}
              onChange={(e) =>
                setMarginPercent(Math.max(0, parseInt(e.target.value) || 0))
              }
              min={0}
              max={200}
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={freeShippingOnly}
                onChange={(e) => setFreeShippingOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Free Shipping Only</span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={searchProducts}
            disabled={searching || !connectionStatus?.ok}
            className="rounded bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? "Searching..." : "Search Products"}
          </button>
          <Link
            href="/admin/cj/queue"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 font-medium hover:bg-gray-50"
          >
            Review Queue
          </Link>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
        
        {queueSuccess && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800 text-sm flex items-center justify-between">
            <span>{queueSuccess}</span>
            <div className="flex items-center gap-2">
              <Link href="/admin/cj/queue" className="text-green-700 underline font-medium">
                Go to Queue
              </Link>
              <button onClick={() => setQueueSuccess(null)} className="text-green-600 hover:text-green-800">
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {products.length > 0 && (
        <div className="rounded-lg border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">
                Results ({products.length} of {totalFound} found)
              </h2>
              {needsReviewCount > 0 && (
                <p className="text-sm text-amber-600">
                  {needsReviewCount} products need pricing review
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedCount} selected
              </span>
              <button
                onClick={selectAll}
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedProducts.has(product.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                } ${product.pricing.needsReview ? "ring-2 ring-amber-300" : ""}`}
                onClick={() => toggleProduct(product.id)}
              >
                {product.bigImage && (
                  <img
                    src={product.bigImage}
                    alt={product.nameEn}
                    className="w-full h-40 object-cover rounded mb-3"
                  />
                )}
                <h3 className="font-medium text-sm line-clamp-2 mb-2">
                  {product.nameEn}
                </h3>

                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>CJ Price:</span>
                    <span className="font-medium">
                      ${parseFloat(product.discountPrice || product.sellPrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping to KSA:</span>
                    <span>${product.shippingUSD.toFixed(2)} ({product.shippingDays} days)</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Final Price:</span>
                    <span>SAR {product.pricing.roundedPriceSAR}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span>SAR {product.pricing.profitSAR.toFixed(2)} ({product.pricing.actualMarginPercent.toFixed(0)}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock:</span>
                    <span>{product.warehouseInventoryNum}</span>
                  </div>
                </div>

                {product.pricing.needsReview && (
                  <div className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                    {product.pricing.reviewReason}
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  SKU: {product.sku}
                </div>
              </div>
            ))}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm">
                <strong>{selectedCount}</strong> products selected for import
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="rounded bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700 disabled:opacity-50"
                  disabled={addingToQueue}
                  onClick={addToQueue}
                >
                  {addingToQueue ? "Adding..." : "Add to Import Queue"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing Info */}
      <div className="rounded-lg border bg-gray-50 p-4">
        <h3 className="font-medium mb-2">KSA Pricing Formula</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Base Cost = CJ Product Price + Shipping to Saudi Arabia</p>
          <p>+ VAT (15%)</p>
          <p>+ Payment Gateway Fee (2.9%)</p>
          <p>+ Your Profit Margin ({marginPercent}%)</p>
          <p className="font-medium text-gray-800">
            = Final Price (rounded to 49/79/99/149/199/249/299 SAR)
          </p>
        </div>
      </div>
    </div>
  );
}
