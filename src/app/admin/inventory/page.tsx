"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
  Download,
  Filter,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";

type ProductStock = {
  id: number;
  title: string;
  sku: string | null;
  cj_product_id: string | null;
  stock: number;
  safety_buffer: number;
  display_stock: number;
  price: number;
  is_active: boolean;
  updated_at: string;
};

const SAFETY_BUFFER = 5;
const LOW_STOCK_THRESHOLD = 10;

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out" | "hidden">("all");
  const [acting, setActing] = useState<number | null>(null);

  async function loadInventory() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/inventory", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      
      const mapped = (data.products || []).map((p: any) => ({
        ...p,
        safety_buffer: SAFETY_BUFFER,
        display_stock: Math.max(0, (p.stock || 0) - SAFETY_BUFFER),
      }));
      setProducts(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load inventory");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function toggleVisibility(productId: number, currentActive: boolean) {
    setActing(productId);
    try {
      const res = await fetch(`/api/admin/inventory/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Update failed");
      await loadInventory();
    } catch (e: any) {
      setError(e?.message || "Failed to update product");
    } finally {
      setActing(null);
    }
  }

  function exportCSV() {
    const headers = ["ID", "Title", "SKU", "Actual Stock", "Display Stock", "Price", "Status"];
    const rows = filteredProducts.map(p => [
      p.id,
      `"${p.title.replace(/"/g, '""')}"`,
      p.sku || "",
      p.stock,
      p.display_stock,
      p.price,
      p.is_active ? "Active" : "Hidden"
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredProducts = products.filter(p => {
    if (search) {
      const s = search.toLowerCase();
      if (!p.title.toLowerCase().includes(s) && !(p.sku || "").toLowerCase().includes(s)) {
        return false;
      }
    }
    
    switch (filter) {
      case "low":
        return p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0 && p.is_active;
      case "out":
        return p.stock === 0 || p.display_stock === 0;
      case "hidden":
        return !p.is_active;
      default:
        return true;
    }
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => p.stock <= LOW_STOCK_THRESHOLD && p.stock > 0 && p.is_active).length,
    outOfStock: products.filter(p => p.stock === 0 || p.display_stock === 0).length,
    hidden: products.filter(p => !p.is_active).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor stock levels and manage product visibility</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={loadInventory}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Low Stock</p>
          <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Hidden</p>
          <p className="text-2xl font-bold text-gray-600">{stats.hidden}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Safety Buffer Active</p>
            <p className="text-sm text-blue-700 mt-0.5">
              Display stock = Actual stock - {SAFETY_BUFFER} units. This prevents overselling by reserving buffer inventory.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or SKU..."
                className="flex-1 border-0 focus:ring-0 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">All Products ({stats.total})</option>
                <option value="low">Low Stock ({stats.lowStock})</option>
                <option value="out">Out of Stock ({stats.outOfStock})</option>
                <option value="hidden">Hidden ({stats.hidden})</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No products found</p>
            <p className="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="divide-y">
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase">
              <div className="flex-1">Product</div>
              <div className="w-24 text-center">Actual Stock</div>
              <div className="w-24 text-center">Display Stock</div>
              <div className="w-20 text-center">Status</div>
              <div className="w-28 text-center">Visibility</div>
            </div>

            {filteredProducts.map((product) => {
              const isLow = product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0;
              const isOut = product.stock === 0 || product.display_stock === 0;
              
              return (
                <div 
                  key={product.id} 
                  className={`px-4 py-3 flex items-center gap-4 hover:bg-gray-50 ${
                    !product.is_active ? "bg-gray-50 opacity-75" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.title}</p>
                    <p className="text-xs text-gray-500">{product.sku || `ID: ${product.id}`}</p>
                  </div>

                  <div className="w-24 text-center">
                    <span className={`font-medium ${
                      isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-gray-900"
                    }`}>
                      {product.stock}
                    </span>
                  </div>

                  <div className="w-24 text-center">
                    <span className={`font-bold ${
                      product.display_stock === 0 ? "text-red-600" : 
                      product.display_stock <= 5 ? "text-amber-600" : "text-green-600"
                    }`}>
                      {product.display_stock}
                    </span>
                  </div>

                  <div className="w-20 text-center">
                    {isOut ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                        <XCircle className="h-3.5 w-3.5" />
                        Out
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        OK
                      </span>
                    )}
                  </div>

                  <div className="w-28 text-center">
                    <button
                      onClick={() => toggleVisibility(product.id, product.is_active)}
                      disabled={acting === product.id}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        product.is_active 
                          ? "bg-green-100 text-green-700 hover:bg-green-200" 
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      } ${acting === product.id ? "opacity-50" : ""}`}
                    >
                      {product.is_active ? (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Visible
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Hidden
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
