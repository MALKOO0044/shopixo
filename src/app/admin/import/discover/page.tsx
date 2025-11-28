"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Package, Loader2, CheckCircle } from "lucide-react";

type CjProduct = {
  pid: string;
  name: string;
  images: string[];
  variants: Array<{
    cjSku?: string;
    size?: string;
    color?: string;
    price?: number;
    stock?: number;
  }>;
  supplierRating?: number;
  totalSales?: number;
  processingDays?: number;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  qualityScore?: number;
};

type Category = {
  categoryId: string;
  categoryName: string;
};

export default function ProductDiscoveryPage() {
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("all");
  const [quantity, setQuantity] = useState(25);
  const [minStock, setMinStock] = useState(10);
  const [maxPrice, setMaxPrice] = useState(100);
  const [minPrice, setMinPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(50);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CjProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latency: number;
    categoryCount: number;
    message: string;
  } | null>(null);
  
  const [batchName, setBatchName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBatchId, setSavedBatchId] = useState<number | null>(null);

  const testConnection = async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/admin/cj/categories");
      const data = await res.json();
      const latency = Date.now() - start;
      
      if (data.ok && data.categories) {
        setCategories(data.categories);
        setConnectionStatus({
          connected: true,
          latency,
          categoryCount: data.categories.length,
          message: `Connected successfully. Found ${data.categories.length} category groups.`
        });
      } else {
        setConnectionStatus({
          connected: false,
          latency,
          categoryCount: 0,
          message: data.error || "Connection failed"
        });
      }
    } catch (e: any) {
      setConnectionStatus({
        connected: false,
        latency: Date.now() - start,
        categoryCount: 0,
        message: e?.message || "Connection failed"
      });
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const calculateQualityScore = useCallback((product: any): number => {
    const rating = product.supplierRating || 4;
    const salesScore = Math.min(product.totalSales || 0, 10000) / 10000;
    const supplierScore = 0.8;
    return (rating / 5 * 0.4) + (salesScore * 0.3) + (supplierScore * 0.3);
  }, []);

  const searchProducts = async () => {
    if (!keywords.trim()) {
      setError("Please enter search keywords");
      return;
    }
    
    setLoading(true);
    setError(null);
    setProducts([]);
    setSavedBatchId(null);
    
    try {
      const params = new URLSearchParams({
        keywords: keywords.trim(),
        quantity: quantity.toString(),
        category: category,
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
        minStock: minStock.toString(),
        profitMargin: profitMargin.toString(),
        freeShippingOnly: freeShippingOnly ? "1" : "0",
      });
      
      const res = await fetch(`/api/admin/cj/products/query?${params}`);
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Search failed: ${res.status}`);
      }
      
      const productsWithScore = (data.products || []).map((p: any) => ({
        ...p,
        qualityScore: calculateQualityScore(p),
      })).sort((a: CjProduct, b: CjProduct) => (b.qualityScore || 0) - (a.qualityScore || 0));
      
      setProducts(productsWithScore);
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (pid: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(products.map(p => p.pid)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const saveBatch = async () => {
    if (selected.size === 0) {
      setError("Select at least one product");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const selectedProducts = products.filter(p => selected.has(p.pid));
      
      const res = await fetch("/api/admin/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName || `${keywords} - ${new Date().toLocaleDateString()}`,
          keywords,
          category,
          filters: { minStock, minPrice, maxPrice, profitMargin, freeShippingOnly },
          products: selectedProducts,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save batch");
      }
      
      setSavedBatchId(data.batchId);
    } catch (e: any) {
      setError(e?.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connectionStatus?.connected ? (
            <>
              <span className="text-sm text-green-600">{connectionStatus.message}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            </>
          ) : (
            <>
              <span className="text-sm text-red-600">{connectionStatus?.message || "Not connected"}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            </>
          )}
          <span className="text-sm font-medium text-gray-900">CJ Dropshipping API</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {connectionStatus?.latency || 0}ms
          </span>
          <button
            onClick={testConnection}
            className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm hover:bg-gray-50"
          >
            Test Connection
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Search Products</h2>
        
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Keyword</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchProducts()}
              placeholder="e.g., women blouse, men shirt"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Category</label>
            <div className="flex items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Quantity to Find</label>
            <div className="flex items-center gap-2">
              <button
                onClick={searchProducts}
                disabled={loading}
                className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? "..." : "Load"}
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-left"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Min Price (USD)</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Max Price (USD)</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Min Stock</label>
            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Profit Margin %</label>
            <input
              type="number"
              value={profitMargin}
              onChange={(e) => setProfitMargin(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
          
          <div></div>
          
          <div className="flex items-center gap-2 pt-7">
            <input
              type="checkbox"
              checked={freeShippingOnly}
              onChange={(e) => setFreeShippingOnly(e.target.checked)}
              className="w-4 h-4 border-gray-300 rounded"
            />
            <label className="text-sm text-gray-600">Free Shipping Only</label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={searchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Search Products
          </button>
          <Link
            href={"/admin/import/queue" as Route}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
          >
            Review Queue
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Found <strong>{products.length}</strong> products
              </span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-600">
                <strong>{selected.size}</strong> selected
              </span>
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
              <button onClick={deselectAll} className="text-sm text-gray-500 hover:underline">Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const isSelected = selected.has(product.pid);
              const avgPrice = product.variants.length > 0
                ? product.variants.reduce((sum, v) => sum + (v.price || 0), 0) / product.variants.length
                : 0;
              const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
              
              return (
                <div
                  key={product.pid}
                  onClick={() => toggleSelect(product.pid)}
                  className={`bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected ? "bg-blue-500" : "bg-white border"
                    }`}>
                      {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                      Quality: {((product.qualityScore || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <h3 className="font-medium text-gray-900 line-clamp-2 leading-tight text-right" dir="ltr">
                      {product.name}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <span className="text-green-600 font-semibold">${avgPrice.toFixed(2)}</span>
                        <span className="text-gray-400">avg</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Package className="h-3.5 w-3.5" />
                        <span>{totalStock} in stock</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {product.variants.slice(0, 3).map((v, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {v.color || v.size || v.cjSku?.slice(-6)}
                        </span>
                      ))}
                      {product.variants.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                          +{product.variants.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected.size > 0 && (
            <div className="sticky bottom-4 bg-white rounded-xl border shadow-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selected.size} products selected</p>
                  <p className="text-sm text-gray-500">Ready to add to import queue</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Batch name (optional)"
                  className="px-3 py-2 border rounded-lg text-sm w-48"
                  dir="ltr"
                />
                <button
                  onClick={saveBatch}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Add to Queue
                </button>
              </div>
            </div>
          )}

          {savedBatchId && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800">
                  {selected.size} products added to queue successfully!
                </span>
              </div>
              <Link
                href={"/admin/import/queue" as Route}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                View Queue
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
