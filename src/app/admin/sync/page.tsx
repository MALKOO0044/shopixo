"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Package,
  Eye,
  Check,
  X,
  CheckCheck,
  ArrowLeft,
  Filter,
  Calendar
} from "lucide-react";

type SyncChange = {
  id: number;
  product_id: number;
  cj_product_id: string;
  change_type: "price" | "stock" | "shipping" | "availability";
  old_value: string | null;
  new_value: string | null;
  change_amount: number | null;
  status: "pending" | "approved" | "rejected" | "auto_applied";
  detected_at: string;
  product_title?: string;
  product_sku?: string;
};

export default function DailySyncPage() {
  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  async function loadChanges() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      
      const res = await fetch(`/api/admin/sync/changes?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setChanges(data.changes || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load sync changes");
      setChanges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChanges();
  }, [filterType, filterStatus]);

  async function handleAction(ids: number[], action: "approve" | "reject") {
    setActing(true);
    try {
      const res = await fetch("/api/admin/sync/changes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Action failed");
      setSelectedIds(new Set());
      await loadChanges();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing(false);
    }
  }

  async function handleApplyAll() {
    const pendingIds = changes.filter(c => c.status === "pending").map(c => c.id);
    if (pendingIds.length === 0) return;
    await handleAction(pendingIds, "approve");
  }

  function toggleSelect(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function selectAll() {
    setSelectedIds(new Set(changes.map(c => c.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  const stats = {
    total: changes.length,
    pending: changes.filter(c => c.status === "pending").length,
    price: changes.filter(c => c.change_type === "price").length,
    stock: changes.filter(c => c.change_type === "stock").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Sync Changes</h1>
            <p className="text-sm text-gray-500 mt-1">Review and apply product updates from CJ Dropshipping</p>
          </div>
        </div>
        <button
          onClick={() => loadChanges()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Total Changes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Price Changes</p>
          <p className="text-2xl font-bold text-purple-600">{stats.price}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">Stock Changes</p>
          <p className="text-2xl font-bold text-blue-600">{stats.stock}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="border-b p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="price">Price Changes</option>
                <option value="stock">Stock Changes</option>
                <option value="shipping">Shipping Changes</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex-1" />

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedIds.size} selected</span>
                <button
                  onClick={() => handleAction(Array.from(selectedIds), "approve")}
                  disabled={acting}
                  className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleAction(Array.from(selectedIds), "reject")}
                  disabled={acting}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            )}

            {stats.pending > 0 && selectedIds.size === 0 && (
              <button
                onClick={handleApplyAll}
                disabled={acting}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Apply All Changes ({stats.pending})
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading changes...</div>
        ) : changes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No sync changes found</p>
            <p className="text-sm mt-1">All products are up to date with CJ Dropshipping</p>
          </div>
        ) : (
          <div className="divide-y">
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase">
              <div className="w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.size === changes.length && changes.length > 0}
                  onChange={() => selectedIds.size === changes.length ? deselectAll() : selectAll()}
                  className="rounded"
                />
              </div>
              <div className="flex-1">Product</div>
              <div className="w-28">Type</div>
              <div className="w-40">Change</div>
              <div className="w-24">Status</div>
              <div className="w-32">Detected</div>
              <div className="w-24 text-right">Actions</div>
            </div>

            {changes.map((change) => (
              <div key={change.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(change.id)}
                    onChange={() => toggleSelect(change.id)}
                    className="rounded"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {change.product_title || `Product #${change.product_id}`}
                  </p>
                  <p className="text-xs text-gray-500">{change.product_sku || change.cj_product_id}</p>
                </div>

                <div className="w-28">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                    change.change_type === "price" ? "bg-purple-100 text-purple-700" :
                    change.change_type === "stock" ? "bg-blue-100 text-blue-700" :
                    change.change_type === "shipping" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {change.change_type === "price" ? <TrendingUp className="h-3 w-3" /> :
                     change.change_type === "stock" ? <Package className="h-3 w-3" /> :
                     <Eye className="h-3 w-3" />}
                    {change.change_type}
                  </span>
                </div>

                <div className="w-40">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 line-through">{change.old_value || "N/A"}</span>
                    <span className="text-gray-400">→</span>
                    <span className={`font-medium ${
                      change.change_type === "price" && change.change_amount && change.change_amount > 0 
                        ? "text-red-600" 
                        : change.change_type === "price" && change.change_amount && change.change_amount < 0
                        ? "text-green-600"
                        : "text-gray-900"
                    }`}>
                      {change.new_value || "N/A"}
                      {change.change_amount && change.change_type === "price" && (
                        <span className="ml-1 text-xs">
                          ({change.change_amount > 0 ? "+" : ""}{change.change_amount.toFixed(2)})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="w-24">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                    change.status === "pending" ? "bg-amber-100 text-amber-700" :
                    change.status === "approved" ? "bg-green-100 text-green-700" :
                    change.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {change.status}
                  </span>
                </div>

                <div className="w-32 text-sm text-gray-500">
                  {new Date(change.detected_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>

                <div className="w-24 flex justify-end gap-1">
                  {change.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleAction([change.id], "approve")}
                        disabled={acting}
                        className="rounded p-1.5 text-green-600 hover:bg-green-50"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAction([change.id], "reject")}
                        disabled={acting}
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
    </div>
  );
}
