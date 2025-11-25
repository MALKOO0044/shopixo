"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

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
  status: "pending" | "approved" | "rejected" | "imported";
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

export default function CJQueuePage() {
  const [products, setProducts] = useState<QueuedProduct[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, approved: 0, rejected: 0, imported: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [filterBatch, setFilterBatch] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const [editingProduct, setEditingProduct] = useState<QueuedProduct | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cj/v2/queue");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      setProducts(data.products || []);
      setBatches(data.batches || []);
      setStats(data.stats || { pending: 0, approved: 0, total: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const filteredProducts = products.filter(p => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterBatch && p.batch_id !== filterBatch) return false;
    return true;
  });

  function toggleProduct(id: number) {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
  }

  function deselectAll() {
    setSelectedProducts(new Set());
  }

  async function handleBulkAction(action: "approve" | "reject" | "restore") {
    if (selectedProducts.size === 0) return;
    
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/cj/v2/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selectedProducts),
          action,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      setSelectedProducts(new Set());
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action} products`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Delete ${selectedProducts.size} products from queue?`)) return;
    
    setActionLoading(true);
    try {
      const ids = Array.from(selectedProducts).join(",");
      const res = await fetch(`/api/admin/cj/v2/queue?ids=${ids}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      setSelectedProducts(new Set());
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete products");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePriceUpdate() {
    if (!editingProduct) return;
    if (!editPrice || editPrice <= 0) {
      setError("Price must be a positive number");
      return;
    }
    
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/cj/v2/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [editingProduct.id],
          action: "update_price",
          newPriceSAR: editPrice,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error);
      
      setEditingProduct(null);
      await loadQueue();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update price");
    } finally {
      setActionLoading(false);
    }
  }

  const selectedCount = selectedProducts.size;
  const pendingProducts = filteredProducts.filter(p => p.status === "pending");
  const approvedProducts = filteredProducts.filter(p => p.status === "approved");
  const rejectedProducts = filteredProducts.filter(p => p.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-gray-600 text-sm mt-1">
            Review and approve products before importing to your store
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cj/import"
            className="text-sm text-blue-600 hover:underline"
          >
            Search Products
          </Link>
          <Link
            href="/admin/cj"
            className="text-sm text-blue-600 hover:underline"
          >
            CJ Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-600 underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600">Ready to Import</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-3xl font-bold text-gray-600">{stats.total}</div>
          <div className="text-sm text-gray-600">Total in Queue</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "approved" | "rejected")}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="all">All ({products.length})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="approved">Approved ({stats.approved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Batch</label>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.total_products})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedCount} selected</span>
            <button
              onClick={selectAllVisible}
              className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
            >
              Deselect
            </button>
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">{selectedCount} products selected</span>
            <div className="flex-1" />
            <button
              onClick={() => handleBulkAction("approve")}
              disabled={actionLoading}
              className="rounded bg-green-600 px-4 py-2 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              disabled={actionLoading}
              className="rounded bg-amber-600 px-4 py-2 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleBulkAction("restore")}
              disabled={actionLoading}
              className="rounded bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Restore to Pending
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="rounded bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          Loading queue...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500 mb-4">No products in queue</p>
          <Link
            href="/admin/cj/import"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Search & Add Products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingProducts.length > 0 && filterStatus !== "approved" && (
            <div className="rounded-lg border bg-white p-4">
              <h2 className="font-semibold text-lg mb-4 text-amber-700">
                Pending Review ({pendingProducts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pendingProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedProducts.has(product.id)}
                    onToggle={() => toggleProduct(product.id)}
                    onEdit={() => {
                      setEditingProduct(product);
                      setEditPrice(product.final_price_sar);
                    }}
                    onApprove={async () => {
                      setActionLoading(true);
                      try {
                        await fetch("/api/admin/cj/v2/queue", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            productIds: [product.id],
                            action: "approve",
                          }),
                        });
                        await loadQueue();
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    onReject={async () => {
                      setActionLoading(true);
                      try {
                        await fetch("/api/admin/cj/v2/queue", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            productIds: [product.id],
                            action: "reject",
                          }),
                        });
                        await loadQueue();
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {approvedProducts.length > 0 && filterStatus !== "pending" && filterStatus !== "rejected" && (
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-green-700">
                  Ready to Import ({approvedProducts.length})
                </h2>
                <button
                  onClick={() => alert(`Ready to import ${approvedProducts.length} products. Import functionality coming next!`)}
                  className="rounded bg-green-600 px-4 py-2 text-white font-medium hover:bg-green-700"
                >
                  Import All Approved
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {approvedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedProducts.has(product.id)}
                    onToggle={() => toggleProduct(product.id)}
                    onEdit={() => {
                      setEditingProduct(product);
                      setEditPrice(product.final_price_sar);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {rejectedProducts.length > 0 && (filterStatus === "all" || filterStatus === "rejected") && (
            <div className="rounded-lg border bg-white p-4">
              <h2 className="font-semibold text-lg text-red-700 mb-4">
                Rejected ({rejectedProducts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rejectedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedProducts.has(product.id)}
                    onToggle={() => toggleProduct(product.id)}
                    onEdit={() => {
                      setEditingProduct(product);
                      setEditPrice(product.final_price_sar);
                    }}
                    onRestore={async () => {
                      setActionLoading(true);
                      try {
                        await fetch("/api/admin/cj/v2/queue", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            productIds: [product.id],
                            action: "restore",
                          }),
                        });
                        await loadQueue();
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Edit Price</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Product</label>
                <p className="text-sm font-medium line-clamp-2">{editingProduct.name_en}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">CJ Price:</span>
                  <span className="ml-2 font-medium">${editingProduct.cj_price_usd.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Shipping:</span>
                  <span className="ml-2 font-medium">${editingProduct.shipping_usd.toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Final Price (SAR)</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded border px-3 py-2"
                  min={0}
                  step={1}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: SAR {editingProduct.final_price_sar} | 
                  Profit: SAR {editingProduct.profit_sar.toFixed(2)} ({editingProduct.margin_percent.toFixed(0)}%)
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 rounded border px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePriceUpdate}
                  disabled={actionLoading}
                  className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
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

function ProductCard({
  product,
  selected,
  onToggle,
  onEdit,
  onApprove,
  onReject,
  onRestore,
}: {
  product: QueuedProduct;
  selected: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRestore?: () => void;
}) {
  const isPending = product.status === "pending";
  const isRejected = product.status === "rejected";
  
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50"
          : isPending
          ? "border-amber-200 bg-amber-50/30"
          : isRejected
          ? "border-red-200 bg-red-50/30"
          : "border-green-200 bg-green-50/30"
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 rounded"
        />
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name_en}
            className="w-16 h-16 object-cover rounded flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-xs line-clamp-2">{product.name_en}</h3>
          <p className="text-xs text-gray-500 mt-1">{product.cj_sku}</p>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">CJ Cost:</span>
          <span>${product.cj_price_usd.toFixed(2)} + ${product.shipping_usd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-medium text-green-700">
          <span>Sale Price:</span>
          <span>SAR {product.final_price_sar}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Profit:</span>
          <span>SAR {product.profit_sar.toFixed(2)} ({product.margin_percent.toFixed(0)}%)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Stock:</span>
          <span>{product.stock}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={onEdit}
          className="flex-1 rounded border px-2 py-1 text-xs hover:bg-gray-50"
        >
          Edit Price
        </button>
        {isPending && onApprove && onReject && (
          <>
            <button
              onClick={onApprove}
              className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="flex-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
            >
              Reject
            </button>
          </>
        )}
        {isRejected && onRestore && (
          <button
            onClick={onRestore}
            className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
          >
            Restore
          </button>
        )}
      </div>

      {product.category_path && (
        <p className="text-xs text-gray-400 mt-2 truncate">{product.category_path}</p>
      )}
    </div>
  );
}
