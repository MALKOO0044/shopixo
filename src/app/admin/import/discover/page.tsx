"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Package, Loader2, CheckCircle, Star, Trash2, Eye, X, Play, TrendingUp } from "lucide-react";

type PricedVariant = {
  variantId: string;
  variantSku: string;
  variantPriceUSD: number;
  shippingAvailable: boolean;
  shippingPriceUSD: number;
  shippingPriceSAR: number;
  deliveryDays: string;
  logisticName?: string;
  sellPriceSAR: number;
  totalCostSAR: number;
  profitSAR: number;
  error?: string;
};

type PricedProduct = {
  pid: string;
  cjSku: string;
  name: string;
  images: string[];
  minPriceSAR: number;
  maxPriceSAR: number;
  avgPriceSAR: number;
  stock: number;
  listedNum: number;
  variants: PricedVariant[];
  successfulVariants: number;
  totalVariants: number;
};

type Category = {
  categoryId: string;
  categoryName: string;
  children?: Category[];
};

type FeatureOption = {
  id: string;
  name: string;
  parentId?: string;
  level: number;
};

export default function ProductDiscoveryPage() {
  const [category, setCategory] = useState("all");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(50);
  const [minStock, setMinStock] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100);
  const [minPrice, setMinPrice] = useState(0);
  const [profitMargin, setProfitMargin] = useState(8);
  const [popularity, setPopularity] = useState("any");
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<PricedProduct[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [features, setFeatures] = useState<FeatureOption[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    latency: number;
    categoryCount: number;
    message: string;
  } | null>(null);
  
  const [batchName, setBatchName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedBatchId, setSavedBatchId] = useState<number | null>(null);
  
  const [previewProduct, setPreviewProduct] = useState<PricedProduct | null>(null);

  const quantityPresets = [1000, 500, 250, 100, 50, 25, 10];
  const profitPresets = [100, 50, 25, 15, 8];

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
        
        const allFeatures: FeatureOption[] = [];
        const extractFeatures = (cats: Category[], level: number = 0, parentId?: string) => {
          for (const cat of cats) {
            allFeatures.push({
              id: cat.categoryId,
              name: cat.categoryName,
              parentId,
              level,
            });
            if (cat.children && cat.children.length > 0) {
              extractFeatures(cat.children, level + 1, cat.categoryId);
            }
          }
        };
        extractFeatures(data.categories);
        setFeatures(allFeatures);
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

  const loadFeatures = async (categoryId: string) => {
    if (categoryId === "all") {
      setSelectedFeatures([]);
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/cj/categories?parentId=${categoryId}`);
      const data = await res.json();
      if (data.ok && data.categories) {
        const newFeatures: FeatureOption[] = data.categories.map((cat: Category) => ({
          id: cat.categoryId,
          name: cat.categoryName,
          parentId: categoryId,
          level: 2,
        }));
        setFeatures(prev => {
          const filtered = prev.filter(f => f.parentId !== categoryId);
          return [...filtered, ...newFeatures];
        });
      }
    } catch (e) {
      console.error("Failed to load features:", e);
    }
  };

  const searchProducts = async () => {
    if (category === "all" && selectedFeatures.length === 0) {
      setError("Please select a category or feature to search");
      return;
    }
    
    setLoading(true);
    setError(null);
    setProducts([]);
    setSelected(new Set());
    setSavedBatchId(null);
    setSearchProgress("Searching products and calculating prices (estimated 2 min)...");
    
    try {
      const categoryIds = selectedFeatures.length > 0 ? selectedFeatures : [category];
      
      const params = new URLSearchParams({
        categoryIds: categoryIds.join(","),
        quantity: quantity.toString(),
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
        minStock: minStock.toString(),
        profitMargin: profitMargin.toString(),
        popularity: popularity,
        freeShippingOnly: freeShippingOnly ? "1" : "0",
      });
      
      const res = await fetch(`/api/admin/cj/products/search-and-price?${params}`, {
        method: 'GET',
      });
      
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Search failed: ${res.status}`);
      }
      
      const pricedProducts: PricedProduct[] = data.products || [];
      setProducts(pricedProducts);
      
      if (pricedProducts.length === 0) {
        setError("No products found. Try different filters or select more features.");
      }
      
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
      setSearchProgress("");
    }
  };

  const toggleSelect = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
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

  const removeProduct = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProducts(prev => prev.filter(p => p.pid !== productId));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const openPreview = (product: PricedProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewProduct(product);
  };

  const saveBatch = async () => {
    if (selected.size === 0) return;
    
    setSaving(true);
    try {
      const selectedProducts = products.filter(p => selected.has(p.pid));
      const res = await fetch("/api/admin/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName || `Discovery ${new Date().toLocaleDateString()}`,
          products: selectedProducts.map(p => ({
            cjProductId: p.pid,
            cjSku: p.cjSku,
            name: p.name,
            images: p.images,
            minPriceSAR: p.minPriceSAR,
            maxPriceSAR: p.maxPriceSAR,
            avgPriceSAR: p.avgPriceSAR,
            stock: p.stock,
            variants: p.variants,
          })),
        }),
      });
      
      const data = await res.json();
      if (data.ok && data.batchId) {
        setSavedBatchId(data.batchId);
      } else {
        throw new Error(data.error || "Failed to save batch");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save batch");
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(f => f !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const getFeatureName = (id: string) => {
    const feature = features.find(f => f.id === id);
    return feature?.name || id;
  };

  const getCategoryChildren = (parentId: string) => {
    return features.filter(f => f.parentId === parentId);
  };

  const selectedCategory = categories.find(c => c.categoryId === category);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Search Products</h1>
      </div>

      {connectionStatus && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
          connectionStatus.connected 
            ? "bg-green-50 border-green-200" 
            : "bg-red-50 border-red-200"
        }`}>
          <button
            onClick={testConnection}
            className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Test Connection
          </button>
          <span className="text-sm text-gray-600">{connectionStatus.latency}ms</span>
          <span className={`text-sm ${connectionStatus.connected ? "text-green-700" : "text-red-700"}`}>
            CJ Dropshipping API {connectionStatus.connected ? "●" : "○"} {connectionStatus.message}
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSelectedFeatures([]);
                loadFeatures(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Features ({selectedFeatures.length} selected)</label>
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) toggleFeature(e.target.value);
                  e.target.value = "";
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded appearance-none"
              >
                <option value="">Select features...</option>
                {selectedCategory?.children?.map(child => (
                  <optgroup key={child.categoryId} label={child.categoryName}>
                    {child.children?.map(subChild => (
                      <option 
                        key={subChild.categoryId} 
                        value={subChild.categoryId}
                        disabled={selectedFeatures.includes(subChild.categoryId)}
                      >
                        {subChild.categoryName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedFeatures.map(featureId => (
                <span
                  key={featureId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs"
                >
                  {getFeatureName(featureId)}
                  <button
                    onClick={() => toggleFeature(featureId)}
                    className="hover:text-amber-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Quantity to Find</label>
            <div className="flex gap-1 mb-2">
              {quantityPresets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setQuantity(preset)}
                  className={`px-2 py-1 text-xs rounded ${
                    quantity === preset
                      ? "bg-amber-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
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
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">Popularity</label>
            <select
              value={popularity}
              onChange={(e) => setPopularity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="any">Any Popularity</option>
              <option value="high">High (1000+ listed)</option>
              <option value="medium">Medium (100-999 listed)</option>
              <option value="low">Low (&lt;100 listed)</option>
            </select>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-amber-700 font-medium">*Profit Margin % ({profitMargin}%)</span>
              <div className="flex gap-1">
                {profitPresets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setProfitMargin(preset)}
                    className={`px-3 py-1.5 text-sm rounded ${
                      profitMargin === preset
                        ? "bg-amber-500 text-white font-medium"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
              <span className="text-gray-400">%</span>
              <input
                type="number"
                value={profitMargin}
                onChange={(e) => setProfitMargin(Number(e.target.value))}
                className="w-16 px-2 py-1.5 border border-gray-300 rounded text-center"
                dir="ltr"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={freeShippingOnly}
                onChange={(e) => setFreeShippingOnly(e.target.checked)}
                className="w-4 h-4 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">Free Shipping Only</label>
            </div>
          </div>
          <p className="text-xs text-amber-600 mt-2 text-right">
            Set your desired profit margin. Products will display final SAR sell prices including shipping + profit when search completes.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href={"/admin/import/queue" as Route}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Review Queue
          </Link>
          <button
            onClick={searchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Search Products
          </button>
        </div>
      </div>

      {loading && searchProgress && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <div className="flex-1">
              <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
            <span className="text-sm text-amber-700">{searchProgress}</span>
          </div>
          <p className="text-xs text-amber-600 mt-2">
            Searching products, calculating shipping costs, and applying {profitMargin}% profit margin. Products will display final SAR sell prices including shipping + profit when search completes.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {products.length > 0 && (
        <>
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-900">
                Found <strong>{products.length}</strong> products with prices
              </span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-600">
                <strong>{selected.size}</strong> selected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
              <button onClick={deselectAll} className="text-sm text-gray-500 hover:underline">Clear</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => {
              const isSelected = selected.has(product.pid);
              
              return (
                <div
                  key={product.pid}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={(e) => toggleSelect(product.pid, e)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? "bg-blue-500" : "bg-white border border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                      </button>
                    </div>
                    
                    <div className="absolute top-2 left-2 flex gap-1">
                      <button
                        onClick={(e) => openPreview(product, e)}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => removeProduct(product.pid, e)}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-xs text-white">
                      <TrendingUp className="h-3 w-3" />
                      {product.listedNum || 0}
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight" dir="ltr">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono" title={product.cjSku}>
                      SKU: {product.cjSku.length > 12 ? `...${product.cjSku.slice(-8)}` : product.cjSku}
                    </p>
                    
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Sell Price (SAR)</span>
                        <span className="font-bold text-green-700 text-lg">
                          {product.minPriceSAR === product.maxPriceSAR
                            ? `${product.avgPriceSAR.toFixed(0)} SAR`
                            : `${product.minPriceSAR.toFixed(0)} - ${product.maxPriceSAR.toFixed(0)} SAR`
                          }
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Stock</span>
                        <span className={`font-semibold ${product.stock > 0 ? "text-gray-900" : "text-red-500"}`}>
                          {product.stock}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Variants</span>
                        <span className="font-semibold text-gray-900">
                          {product.successfulVariants}/{product.totalVariants}
                        </span>
                      </div>
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

      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Product Preview - Pricing Details</h3>
              <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {previewProduct.images?.[0] && (
                    <img 
                      src={previewProduct.images[0]} 
                      alt={previewProduct.name}
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold" dir="ltr">{previewProduct.name}</h2>
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Supplier SKU:</span>{" "}
                    <span className="font-mono text-blue-600">{previewProduct.cjSku}</span>
                  </p>
                  
                  <div className="bg-green-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Sell Price Range:</span>
                      <span className="text-green-700">
                        {previewProduct.minPriceSAR.toFixed(0)} - {previewProduct.maxPriceSAR.toFixed(0)} SAR
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Average Price:</span>
                      <span className="font-semibold">{previewProduct.avgPriceSAR.toFixed(0)} SAR</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Stock:</span>
                      <span className="font-semibold">{previewProduct.stock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Popularity (Listed):</span>
                      <span className="font-semibold">{previewProduct.listedNum}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priced Variants:</span>
                      <span className="font-semibold">{previewProduct.successfulVariants}/{previewProduct.totalVariants}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Variant Pricing</h4>
                    <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="text-left p-2 font-medium">SKU</th>
                            <th className="text-right p-2 font-medium">Cost (USD)</th>
                            <th className="text-right p-2 font-medium">Ship (SAR)</th>
                            <th className="text-right p-2 font-medium">Sell (SAR)</th>
                            <th className="text-right p-2 font-medium">Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {previewProduct.variants.filter(v => v.shippingAvailable).map((v, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="p-2 font-mono text-xs">{v.variantSku?.slice(-10) || v.variantId?.slice(-8)}</td>
                              <td className="p-2 text-right">${v.variantPriceUSD.toFixed(2)}</td>
                              <td className="p-2 text-right">{v.shippingPriceSAR.toFixed(0)}</td>
                              <td className="p-2 text-right font-semibold text-green-600">{v.sellPriceSAR.toFixed(0)}</td>
                              <td className="p-2 text-right text-blue-600">{v.profitSAR.toFixed(0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
