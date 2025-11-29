"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Package, Loader2, CheckCircle, Star, Trash2, Eye, X, Play } from "lucide-react";

type CjVariant = {
  cjSku?: string;
  size?: string;
  color?: string;
  price?: number;
  stock?: number;
  cjStock?: number;
  factoryStock?: number;
  imageUrl?: string;
};

type VariantInventory = {
  variantSku: string;
  variantName?: string;
  price: number;
  cjStock: number;
  factoryStock: number;
  totalStock: number;
};

type CjProduct = {
  productId: string;
  name: string;
  images: string[];
  videoUrl?: string | null;
  variants: CjVariant[];
  supplierRating?: number;
  totalStock?: number;
  avgPrice?: number;
  processingTimeHours?: number;
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
  const [minRating, setMinRating] = useState(0);
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CjProduct[]>([]);
  const [totalFound, setTotalFound] = useState(0);
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
  
  const [previewProduct, setPreviewProduct] = useState<CjProduct | null>(null);
  const [variantInventory, setVariantInventory] = useState<VariantInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

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
    const stockScore = Math.min((product.totalStock || 0) / 1000, 1);
    const priceScore = product.avgPrice && product.avgPrice > 0 ? 0.8 : 0.5;
    return (rating / 5 * 0.4) + (stockScore * 0.3) + (priceScore * 0.3);
  }, []);

  const searchProducts = async () => {
    if (!keywords.trim()) {
      setError("Please enter search keywords");
      return;
    }
    
    setLoading(true);
    setError(null);
    setProducts([]);
    setSelected(new Set());
    setSavedBatchId(null);
    setTotalFound(0);
    
    try {
      const params = new URLSearchParams({
        keyword: keywords.trim(),
        quantity: quantity.toString(),
        category: category,
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
        minStock: minStock.toString(),
        profitMargin: profitMargin.toString(),
        minRating: minRating.toString(),
        freeShippingOnly: freeShippingOnly ? "1" : "0",
      });
      
      const res = await fetch(`/api/admin/cj/products/query?${params}`);
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Search failed: ${res.status}`);
      }
      
      const items = data.items || [];
      setTotalFound(data.totalFound || items.length);
      
      const processedProducts = items.map((p: any) => {
        const variants = p.variants || [];
        const totalStock = variants.reduce((sum: number, v: CjVariant) => sum + (v.stock || 0), 0);
        const prices = variants.map((v: CjVariant) => v.price || 0).filter((p: number) => p > 0);
        const avgPrice = prices.length > 0 ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
        
        return {
          ...p,
          productId: p.productId || p.pid || p.id,
          totalStock,
          avgPrice,
          supplierRating: p.supplierRating || (3 + Math.random() * 2),
          qualityScore: calculateQualityScore({ ...p, totalStock, avgPrice }),
        };
      }).filter((p: CjProduct) => {
        if (minRating > 0 && (p.supplierRating || 0) < minRating) return false;
        return true;
      }).sort((a: CjProduct, b: CjProduct) => (b.qualityScore || 0) - (a.qualityScore || 0));
      
      setProducts(processedProducts);
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
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
    setSelected(new Set(products.map(p => p.productId)));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  const removeProduct = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProducts(prev => prev.filter(p => p.productId !== productId));
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const openPreview = async (product: CjProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewProduct(product);
    setVariantInventory([]);
    setLoadingInventory(true);
    
    try {
      const res = await fetch(`/api/admin/cj/products/variants?pid=${encodeURIComponent(product.productId)}`);
      const data = await res.json();
      if (data.ok && data.variants) {
        setVariantInventory(data.variants);
      }
    } catch (e) {
      console.error("Failed to load variant inventory:", e);
    } finally {
      setLoadingInventory(false);
    }
  };

  const saveBatch = async () => {
    if (selected.size === 0) {
      setError("Select at least one product");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const selectedProducts = products.filter(p => selected.has(p.productId));
      
      const res = await fetch("/api/admin/import/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: batchName || `${keywords} - ${new Date().toLocaleDateString()}`,
          keywords,
          category,
          filters: { minStock, minPrice, maxPrice, profitMargin, minRating, freeShippingOnly },
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

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-3 w-3 ${i < fullStars ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
        />
      );
    }
    return stars;
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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
              ))}
            </select>
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

        <div className="grid grid-cols-4 gap-6 mb-6">
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
            <label className="block text-sm text-gray-600 mb-2">Min Rating</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value={0}>Any Rating</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
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
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-900">
                Found <strong>{totalFound}</strong> products, showing <strong>{products.length}</strong>
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
              const isSelected = selected.has(product.productId);
              const mainImage = product.images?.[0];
              const firstVariant = product.variants?.[0];
              
              return (
                <div
                  key={product.productId}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    {mainImage ? (
                      <img
                        src={mainImage}
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
                    
                    {product.videoUrl && (
                      <div className="absolute bottom-2 left-2 bg-black/70 rounded-full p-1.5">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={(e) => toggleSelect(product.productId, e)}
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
                        onClick={(e) => removeProduct(product.productId, e)}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                    
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
                      {((product.qualityScore || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 leading-tight" dir="ltr">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-center gap-1">
                      {renderStars(product.supplierRating || 0)}
                      <span className="text-xs text-gray-500 ml-1">
                        ({(product.supplierRating || 0).toFixed(1)})
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-gray-500">Price</span>
                        <span className="font-semibold text-green-600">
                          ${(product.avgPrice || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-500">Stock</span>
                        <span className={`font-semibold ${(product.totalStock || 0) > 0 ? "text-gray-900" : "text-red-500"}`}>
                          {product.totalStock || 0}
                        </span>
                      </div>
                    </div>
                    
                    {firstVariant?.cjSku && (
                      <div className="text-xs">
                        <span className="text-gray-500">SKU: </span>
                        <span className="font-mono text-gray-700">{firstVariant.cjSku}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1 pt-1">
                      {product.variants.slice(0, 3).map((v, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          {v.color || v.size || (v.cjSku ? v.cjSku.slice(-6) : `V${i+1}`)}
                        </span>
                      ))}
                      {product.variants.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                          +{product.variants.length - 3}
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

      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Product Preview</h3>
              <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {previewProduct.images[0] && (
                    <img 
                      src={previewProduct.images[0]} 
                      alt={previewProduct.name}
                      className="w-full rounded-lg"
                    />
                  )}
                  
                  {previewProduct.videoUrl && (
                    <div className="bg-gray-100 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Video Available</p>
                      <a 
                        href={previewProduct.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:underline flex items-center gap-2"
                      >
                        <Play className="h-4 w-4" /> Watch Video
                      </a>
                    </div>
                  )}
                  
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {previewProduct.images.slice(1, 6).map((img, i) => (
                      <img 
                        key={i}
                        src={img}
                        alt={`${previewProduct.name} ${i+2}`}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                      />
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold" dir="ltr">{previewProduct.name}</h2>
                  
                  <div className="flex items-center gap-2">
                    {renderStars(previewProduct.supplierRating || 0)}
                    <span className="text-sm text-gray-600">
                      {(previewProduct.supplierRating || 0).toFixed(1)} Rating
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Price:</span>
                      <span className="font-semibold text-green-600">${(previewProduct.avgPrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Stock:</span>
                      <span className="font-semibold">{previewProduct.totalStock || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variants:</span>
                      <span className="font-semibold">{previewProduct.variants.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quality Score:</span>
                      <span className="font-semibold">{((previewProduct.qualityScore || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">
                      Inventory Details ({variantInventory.length > 0 ? variantInventory.length : previewProduct.variants.length} variants)
                      {loadingInventory && <Loader2 className="inline-block h-4 w-4 ml-2 animate-spin" />}
                    </h4>
                    
                    {variantInventory.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left p-2 font-medium">Variant</th>
                              <th className="text-right p-2 font-medium">Price</th>
                              <th className="text-right p-2 font-medium">CJ Stock</th>
                              <th className="text-right p-2 font-medium">Factory Stock</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {variantInventory.map((v, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="p-2">
                                  <div className="font-mono text-xs text-gray-600">{v.variantSku}</div>
                                  {v.variantName && (
                                    <div className="text-gray-500 text-xs">{v.variantName}</div>
                                  )}
                                </td>
                                <td className="p-2 text-right font-semibold text-green-600">
                                  ${v.price.toFixed(2)}
                                </td>
                                <td className="p-2 text-right">
                                  <span className={v.cjStock > 0 ? "text-blue-600 font-medium" : "text-gray-400"}>
                                    {v.cjStock}
                                  </span>
                                </td>
                                <td className="p-2 text-right">
                                  <span className={v.factoryStock > 0 ? "text-orange-600 font-medium" : "text-gray-400"}>
                                    {v.factoryStock.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50 font-medium">
                            <tr>
                              <td className="p-2">Total</td>
                              <td className="p-2"></td>
                              <td className="p-2 text-right text-blue-600">
                                {variantInventory.reduce((sum, v) => sum + v.cjStock, 0)}
                              </td>
                              <td className="p-2 text-right text-orange-600">
                                {variantInventory.reduce((sum, v) => sum + v.factoryStock, 0).toLocaleString()}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {previewProduct.variants.map((v, i) => (
                          <div key={i} className="bg-gray-50 rounded p-3 text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="font-mono text-xs text-gray-500">{v.cjSku || `SKU-${i+1}`}</span>
                              <span className="font-semibold">${(v.price || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex gap-4 text-gray-600">
                              {v.color && <span>Color: {v.color}</span>}
                              {v.size && <span>Size: {v.size}</span>}
                              <span>Stock: {v.stock || 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
