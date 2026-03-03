"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Loader2,
  Settings,
  ImageIcon,
  Images,
} from "lucide-react";

type InventoryProduct = {
  id: string;
  title: string;
  title_ar: string | null;
  category: string;
  price: number;
  stock: number;
  active: boolean;
  images: string[];
  supplier_sku: string | null;
  product_code: string | null;
  metadata: {
    cj_product_id?: string;
    cj_sku?: string;
    variants?: Array<{
      sku: string;
      stock: number;
      color?: string;
      size?: string;
    }>;
    last_stock_sync?: string;
  };
  updated_at: string;
};

type InventoryStats = {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  hidden: number;
  cjProducts: number;
};

const SAFETY_BUFFER = 5;
const LOW_STOCK_THRESHOLD = 10;

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    total: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    hidden: 0,
    cjProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;
  
  const [refreshingImages, setRefreshingImages] = useState<string | null>(null);
  const [bulkRefreshing, setBulkRefreshing] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        filter,
        search,
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      
      const res = await fetch(`/api/admin/inventory?${params}`);
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to fetch inventory");
      }
      
      setProducts(data.products || []);
      setStats(data.stats || {});
    } catch (e: any) {
      setError(e?.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const toggleVisibility = async (id: string, active: boolean) => {
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !active }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to update");
      }
      
      fetchInventory();
    } catch (e: any) {
      setError(e?.message || "Failed to update");
    }
  };

  const syncAllStock = async () => {
    if (!confirm("Sync stock levels from CJ for all products? This may take a few minutes.")) return;
    
    setSyncing(true);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/inventory/sync", {
        method: "POST",
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Sync failed");
      }
      
      setSuccess(`Synced ${data.updated} products, ${data.outOfStock} marked as out of stock`);
      fetchInventory();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800", icon: AlertTriangle };
    if (stock <= LOW_STOCK_THRESHOLD) return { label: "Low Stock", color: "bg-amber-100 text-amber-800", icon: TrendingDown };
    return { label: "In Stock", color: "bg-green-100 text-green-800", icon: CheckCircle };
  };

  const getImageCountStatus = (images: string[] | null | undefined) => {
    const count = Array.isArray(images) ? images.length : 0;
    if (count === 0) return { count, color: "text-red-600 bg-red-50", label: "No images" };
    if (count === 1) return { count, color: "text-amber-600 bg-amber-50", label: "1 image" };
    return { count, color: "text-green-600 bg-green-50", label: `${count} images` };
  };

  const refreshSingleProductImages = async (productId: string) => {
    setRefreshingImages(productId);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/products/refresh-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: Number(productId) }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to refresh images");
      }
      
      setSuccess(`Refreshed ${data.imagesCount} images for product`);
      fetchInventory();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (e: any) {
      setError(e?.message || "Failed to refresh images");
    } finally {
      setRefreshingImages(null);
    }
  };

  const refreshAllProductImages = async () => {
    if (!confirm("Refresh images for ALL products from CJ? This may take a few minutes.")) return;
    
    setBulkRefreshing(true);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/products/refresh-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Bulk refresh failed");
      }
      
      setSuccess(`Refreshed images for ${data.successfulProducts}/${data.totalProducts} products (${data.totalImages} total images)`);
      fetchInventory();
      
      setTimeout(() => setSuccess(null), 8000);
    } catch (e: any) {
      setError(e?.message || "Bulk refresh failed");
    } finally {
      setBulkRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor and sync stock levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllProductImages}
            disabled={bulkRefreshing || syncing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {bulkRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
            {bulkRefreshing ? "Refreshing All..." : "Refresh All Images"}
          </button>
          <button
            onClick={syncAllStock}
            disabled={syncing || bulkRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <button
          onClick={() => { setFilter("all"); setPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === "all" ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <Package className="h-5 w-5 text-gray-600" />
            <span className="text-xl font-bold text-gray-900">{stats.total}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Total Products</p>
        </button>

        <button
          onClick={() => { setFilter("in_stock"); setPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === "in_stock" ? "border-green-500 bg-green-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-xl font-bold text-gray-900">{stats.inStock}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">In Stock</p>
        </button>

        <button
          onClick={() => { setFilter("low_stock"); setPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === "low_stock" ? "border-amber-500 bg-amber-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <TrendingDown className="h-5 w-5 text-amber-600" />
            <span className="text-xl font-bold text-gray-900">{stats.lowStock}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Low Stock</p>
        </button>

        <button
          onClick={() => { setFilter("out_of_stock"); setPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === "out_of_stock" ? "border-red-500 bg-red-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-xl font-bold text-gray-900">{stats.outOfStock}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Out of Stock</p>
        </button>

        <button
          onClick={() => { setFilter("hidden"); setPage(0); }}
          className={`p-4 rounded-xl border-2 transition-all ${
            filter === "hidden" ? "border-gray-500 bg-gray-100" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <EyeOff className="h-5 w-5 text-gray-600" />
            <span className="text-xl font-bold text-gray-900">{stats.hidden}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Hidden</p>
        </button>

        <div className="p-4 rounded-xl border bg-blue-50">
          <div className="flex items-center justify-between">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">{stats.cjProducts}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">CJ Products</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            Loading inventory...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => {
                const status = getStockStatus(product.stock);
                const StatusIcon = status.icon;
                
                return (
                  <tr key={product.id} className={!product.active ? "bg-gray-50 opacity-75" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 line-clamp-2">{product.title}</p>
                      {product.title_ar && (
                        <p className="text-sm text-gray-500 line-clamp-1" dir="rtl">{product.title_ar}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{product.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      {product.supplier_sku ? (
                        <span className="font-mono text-xs text-blue-600" title={product.supplier_sku}>
                          {product.supplier_sku.length > 12 ? `...${product.supplier_sku.slice(-8)}` : product.supplier_sku}
                        </span>
                      ) : product.metadata?.cj_product_id ? (
                        <span className="font-mono text-xs text-blue-600" title={product.metadata.cj_product_id}>
                          {product.metadata.cj_product_id.length > 12 ? `...${product.metadata.cj_product_id.slice(-8)}` : product.metadata.cj_product_id}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const imgStatus = getImageCountStatus(product.images);
                        const hasCjLink = !!(product.supplier_sku || product.metadata?.cj_product_id);
                        return (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${imgStatus.color}`}>
                              <ImageIcon className="h-3 w-3" />
                              {imgStatus.count}
                            </span>
                            {hasCjLink && (
                              <button
                                onClick={() => refreshSingleProductImages(product.id)}
                                disabled={refreshingImages === product.id || bulkRefreshing}
                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                                title="Refresh images from CJ"
                              >
                                {refreshingImages === product.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5 text-gray-400 hover:text-purple-600" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          product.stock === null ? "text-gray-400" :
                          product.stock === 0 ? "text-red-600" :
                          product.stock <= LOW_STOCK_THRESHOLD ? "text-amber-600" : "text-green-600"
                        }`}>
                          {product.stock === null ? "-" : product.stock}
                        </span>
                        {product.metadata?.variants && product.metadata.variants.length > 1 && (
                          <span className="text-xs text-gray-400">
                            ({product.metadata.variants.length} variants)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleVisibility(product.id, product.active)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          product.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {product.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {product.active ? "Visible" : "Hidden"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${product.id}` as Route}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h3 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Inventory Settings
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm mt-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-gray-500">Safety Buffer</p>
            <p className="font-medium text-gray-900">{SAFETY_BUFFER} units</p>
            <p className="text-xs text-gray-400 mt-1">Reserved from CJ stock</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-gray-500">Low Stock Alert</p>
            <p className="font-medium text-gray-900">&lt; {LOW_STOCK_THRESHOLD} units</p>
            <p className="text-xs text-gray-400 mt-1">Highlighted as low stock</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-gray-500">Auto-Hide</p>
            <p className="font-medium text-gray-900">0 units</p>
            <p className="text-xs text-gray-400 mt-1">Hidden from store when OOS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
