"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ListChecks,
  Check,
  X,
  RefreshCw,
  ArrowLeft,
  Download,
  Edit,
  Package,
  Filter,
  Trash2
} from "lucide-react";

type QueuedProduct = {
  id: number;
  batch_id: string;
  cj_product_id: string;
  cj_sku: string;
  name_en: string;
  image_url: string;
  cj_price_usd: number;
  shipping_usd: number;
  shipping_days: string;
  final_price_sar: number;
  profit_sar: number;
  margin_percent: number;
  stock: number;
  category_path: string;
  status: "pending" | "approved" | "rejected" | "imported" | "skipped";
  admin_notes: string | null;
  created_at: string;
};

type Batch = {
  id: string;
  name: string;
  total_products: number;
  status: string;
  created_at: string;
};

type QueueStats = {
  pending: number;
  approved: number;
  rejected: number;
  imported: number;
  total: number;
};

export default function ImportQueuePage() {
  const [products, setProducts] = useState<QueuedProduct[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    imported: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBatch, setFilterBatch] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const [editingProduct, setEditingProduct] = useState<QueuedProduct | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cj/v2/queue", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load");
      setProducts(data.products || []);
      setBatches(data.batches || []);
      setStats(
        data.stats || { pending: 0, approved: 0, rejected: 0, imported: 0, total: 0 }
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filteredProducts = products.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterBatch && p.batch_id !== filterBatch) return false;
    return true;
  });

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBulkAction(action: "approve" | "reject" | "delete") {
    if (selectedIds.size === 0) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cj/v2/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selectedIds),
          action,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Action failed");

      setSelectedIds(new Set());
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleImportApproved() {
    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/cj/v2/queue/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Import failed");

      setImportResult(
        `Successfully imported ${data.stats?.success || 0} products to your store`
      );
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function openEditModal(product: QueuedProduct) {
    setEditingProduct(product);
    setEditPrice(product.final_price_sar);
    setEditNotes(product.admin_notes || "");
  }

  async function saveEdit() {
    if (!editingProduct) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/cj/v2/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [editingProduct.id],
          action: "update",
          updates: {
            final_price_sar: editPrice,
            admin_notes: editNotes,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Update failed");

      setEditingProduct(null);
      await loadQueue();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Queue</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and import products to your store
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadQueue}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href={"/admin/supplier/discover" as Route}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Package className="h-4 w-4" />
            Discover Products
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Imported</p>
          <p className="text-2xl font-bold text-blue-600">{stats.imported}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {importResult && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          {importResult}
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="imported">Imported</option>
              </select>

              {batches.length > 0 && (
                <select
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex-1" />

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => handleBulkAction("approve")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleBulkAction("reject")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleBulkAction("delete")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}

            {stats.approved > 0 && (
              <button
                onClick={handleImportApproved}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Import to Store ({stats.approved})
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading queue...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ListChecks className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No products in queue</p>
            <p className="text-sm mt-1">
              Discover and add products to your import queue
            </p>
            <Link
              href={"/admin/supplier/discover" as Route}
              className="inline-flex items-center gap-2 mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Discover Products
            </Link>
          </div>
        ) : (
          <div className="divide-y">
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase">
              <div className="w-8">
                <input
                  type="checkbox"
                  checked={
                    selectedIds.size === filteredProducts.length &&
                    filteredProducts.length > 0
                  }
                  onChange={() =>
                    selectedIds.size === filteredProducts.length
                      ? deselectAll()
                      : selectAllVisible()
                  }
                  className="rounded"
                />
              </div>
              <div className="w-16">Image</div>
              <div className="flex-1">Product</div>
              <div className="w-24 text-right">Cost</div>
              <div className="w-24 text-right">Price</div>
              <div className="w-20 text-center">Stock</div>
              <div className="w-24 text-center">Status</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`px-4 py-3 flex items-center gap-4 hover:bg-gray-50 ${
                  product.status === "rejected" ? "opacity-60" : ""
                }`}
              >
                <div className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    className="rounded"
                  />
                </div>

                <div className="w-16">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name_en}
                      className="w-14 h-14 object-cover rounded"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {product.name_en}
                  </p>
                  <p className="text-xs text-gray-500">{product.cj_sku}</p>
                  {product.admin_notes && (
                    <p className="text-xs text-amber-600 mt-1 truncate">
                      Note: {product.admin_notes}
                    </p>
                  )}
                </div>

                <div className="w-24 text-right text-sm">
                  <p>${product.cj_price_usd.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    +${product.shipping_usd.toFixed(2)} ship
                  </p>
                </div>

                <div className="w-24 text-right">
                  <p className="font-medium text-green-700">
                    SAR {product.final_price_sar}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.margin_percent.toFixed(0)}% margin
                  </p>
                </div>

                <div className="w-20 text-center text-sm">{product.stock}</div>

                <div className="w-24 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                      product.status === "pending"
                        ? "bg-amber-100 text-amber-700"
                        : product.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : product.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : product.status === "imported"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>

                <div className="w-24 flex justify-end gap-1">
                  <button
                    onClick={() => openEditModal(product)}
                    className="rounded p-1.5 text-gray-600 hover:bg-gray-100"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {product.status === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedIds(new Set([product.id]));
                          handleBulkAction("approve");
                        }}
                        className="rounded p-1.5 text-green-600 hover:bg-green-50"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIds(new Set([product.id]));
                          handleBulkAction("reject");
                        }}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Edit Product</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Product
                </label>
                <p className="text-sm font-medium line-clamp-2">
                  {editingProduct.name_en}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Cost:</span>
                  <span className="ml-2 font-medium">
                    ${editingProduct.cj_price_usd.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Shipping:</span>
                  <span className="ml-2 font-medium">
                    ${editingProduct.shipping_usd.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Final Price (SAR)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border px-3 py-2"
                  min={0}
                  step={1}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Admin Notes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 h-20"
                  placeholder="Add notes about this product..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 rounded-lg border px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={actionLoading}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
