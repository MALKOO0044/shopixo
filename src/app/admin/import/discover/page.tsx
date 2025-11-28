"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search, Filter, Star, Package, TrendingUp, Clock, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

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

type SearchFilters = {
  minPrice: number;
  maxPrice: number;
  minRating: number;
  minStock: number;
  maxShippingDays: number;
};

const defaultFilters: SearchFilters = {
  minPrice: 0,
  maxPrice: 500,
  minRating: 3,
  minStock: 10,
  maxShippingDays: 20,
};

const categories = [
  { value: "all", label: "All Categories", labelAr: "جميع الفئات" },
  { value: "clothing", label: "Clothing", labelAr: "ملابس" },
  { value: "electronics", label: "Electronics", labelAr: "إلكترونيات" },
  { value: "home", label: "Home & Garden", labelAr: "المنزل والحديقة" },
  { value: "beauty", label: "Beauty", labelAr: "الجمال" },
  { value: "sports", label: "Sports", labelAr: "رياضة" },
  { value: "accessories", label: "Accessories", labelAr: "إكسسوارات" },
];

export default function DiscoverProductsPage() {
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState("all");
  const [quantity, setQuantity] = useState(50);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CjProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const [batchName, setBatchName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBatchId, setSavedBatchId] = useState<number | null>(null);

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
        minPrice: filters.minPrice.toString(),
        maxPrice: filters.maxPrice.toString(),
        minRating: filters.minRating.toString(),
        minStock: filters.minStock.toString(),
        maxShippingDays: filters.maxShippingDays.toString(),
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
          filters,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Products</h1>
          <p className="text-sm text-gray-500 mt-1">اكتشاف المنتجات من CJ Dropshipping</p>
        </div>
        <Link href={"/admin/import/queue" as Route} className="text-sm text-blue-600 hover:underline">
          View Queue →
        </Link>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                placeholder="e.g., women dresses, men shirts, phone cases"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10 products</option>
              <option value={25}>25 products</option>
              <option value={50}>50 products</option>
              <option value={100}>100 products</option>
              <option value={250}>250 products</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Price (USD)</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(f => ({ ...f, minPrice: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded border text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Price (USD)</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(f => ({ ...f, maxPrice: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded border text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Rating</label>
              <select
                value={filters.minRating}
                onChange={(e) => setFilters(f => ({ ...f, minRating: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded border text-sm"
              >
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Min Stock</label>
              <input
                type="number"
                value={filters.minStock}
                onChange={(e) => setFilters(f => ({ ...f, minStock: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded border text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Max Shipping Days</label>
              <input
                type="number"
                value={filters.maxShippingDays}
                onChange={(e) => setFilters(f => ({ ...f, maxShippingDays: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded border text-sm"
                min={1}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={searchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search Products
          </button>
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
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected ? "bg-blue-500" : "bg-white border"
                    }`}>
                      {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                      Quality: {((product.qualityScore || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <h3 className="font-medium text-gray-900 line-clamp-2 leading-tight">
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
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Star className="h-3.5 w-3.5 text-amber-400" />
                        <span>{product.supplierRating?.toFixed(1) || "4.0"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{product.deliveryDaysMin || 7}-{product.deliveryDaysMax || 15} days</span>
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
