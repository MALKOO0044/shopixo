"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Search,
  Package,
  Plus,
  Check,
  RefreshCw,
  Filter,
  ArrowLeft,
  ShoppingBag,
  Edit,
  Trash2
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
  image: string;
  price: number;
  priceUSD: number;
  shippingUSD: number;
  stock: number;
  category: string;
  margin: number;
  finalPriceSAR: number;
};

export default function DiscoverProductsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minStock, setMinStock] = useState(10);
  const [marginPercent, setMarginPercent] = useState(50);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch("/api/admin/cj/v2/status", { cache: "no-store" });
      const data = await res.json();
      setConnectionOk(data.ok && data.connected);
    } catch {
      setConnectionOk(false);
    }
  }

  async function searchProducts() {
    if (!keyword.trim()) {
      setError("Please enter a search keyword");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProducts([]);

    try {
      const params = new URLSearchParams({
        keyword: keyword.trim(),
        minStock: String(minStock),
        marginPercent: String(marginPercent),
      });
      if (minPrice !== "") params.set("minPrice", String(minPrice));
      if (maxPrice !== "") params.set("maxPrice", String(maxPrice));

      const res = await fetch(`/api/admin/cj/v2/search?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Search failed`);
      }

      const mapped = (data.products || []).map((p: any) => ({
        id: p.id || p.cj_product_id,
        name: p.nameEn || p.name,
        sku: p.sku,
        image: p.bigImage || p.image,
        price: parseFloat(p.sellPrice || p.price || 0),
        priceUSD: p.pricing?.baseCostUSD || parseFloat(p.sellPrice || 0),
        shippingUSD: p.shippingUSD || 0,
        stock: p.warehouseInventoryNum || p.stock || 0,
        category: p.threeCategoryName || p.category || "General",
        margin: p.pricing?.actualMarginPercent || marginPercent,
        finalPriceSAR: p.pricing?.roundedPriceSAR || p.pricing?.finalPriceSAR || 0,
      }));

      setProducts(mapped);
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function addToQueue() {
    if (selectedIds.size === 0) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedProducts = products.filter((p) => selectedIds.has(p.id));

      const res = await fetch("/api/admin/cj/v2/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products: selectedProducts.map((p) => ({
            id: p.id,
            nameEn: p.name,
            sku: p.sku,
            bigImage: p.image,
            sellPrice: String(p.price),
            warehouseInventoryNum: p.stock,
            shippingUSD: p.shippingUSD,
            pricing: {
              baseCostUSD: p.priceUSD,
              roundedPriceSAR: p.finalPriceSAR,
              actualMarginPercent: p.margin,
            },
          })),
          batchName: `${keyword} - ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to add");

      setSuccess(`Added ${data.addedCount} products to import queue`);
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e?.message || "Failed to add to queue");
    } finally {
      setAdding(false);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function selectAll() {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              Search and import products from your supplier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectionOk === true && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Connected
            </span>
          )}
          {connectionOk === false && (
            <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Not Connected
            </span>
          )}
          <Link
            href={"/admin/supplier/queue" as Route}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <ShoppingBag className="h-4 w-4" />
            View Queue
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Keywords
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., women dresses, phone cases..."
                className="w-full rounded-lg border pl-10 pr-4 py-2"
                onKeyDown={(e) => e.key === "Enter" && searchProducts()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Stock
            </label>
            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profit Margin %
            </label>
            <input
              type="number"
              value={marginPercent}
              onChange={(e) => setMarginPercent(parseInt(e.target.value) || 0)}
              min={0}
              max={200}
              className="w-full rounded-lg border px-3 py-2"
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
              className="w-full rounded-lg border px-3 py-2"
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
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={searchProducts}
            disabled={loading || !connectionOk}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Searching..." : "Search Products"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 flex items-center justify-between">
            <span>{success}</span>
            <Link
              href={"/admin/supplier/queue" as Route}
              className="text-green-700 underline font-medium"
            >
              Go to Queue
            </Link>
          </div>
        )}
      </div>

      {products.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Found {products.length} Products
              </h2>
              <p className="text-sm text-gray-500">
                {selectedIds.size} selected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Deselect All
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={addToQueue}
                  disabled={adding}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {adding ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add to Queue ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                  selectedIds.has(product.id)
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedIds.has(product.id)
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedIds.has(product.id) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <h3 className="font-medium text-sm text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{product.sku}</p>

                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Cost:</span>
                        <span>${product.priceUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Shipping:</span>
                        <span>${product.shippingUSD.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-green-700">
                        <span>Sale Price:</span>
                        <span>SAR {product.finalPriceSAR}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Stock:</span>
                        <span>{product.stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Margin:</span>
                        <span>{product.margin.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && products.length === 0 && keyword && (
        <div className="rounded-xl border bg-white p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-600">No products found</p>
          <p className="text-sm text-gray-500 mt-1">
            Try different keywords or adjust filters
          </p>
        </div>
      )}
    </div>
  );
}
