"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  ArrowRight,
  Loader2,
  Calendar,
  DollarSign,
  Wrench,
} from "lucide-react";

type SyncChange = {
  id: number;
  shopixo_product_id: string;
  cj_product_id: string;
  change_type: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  status: string;
  sync_date: string;
  created_at: string;
};

type SyncStats = {
  pending: number;
  applied: number;
  dismissed: number;
  price_changes: number;
  stock_changes: number;
  out_of_stock: number;
};

const changeTypeIcons: Record<string, any> = {
  price_increase: TrendingUp,
  price_decrease: TrendingDown,
  stock_low: AlertTriangle,
  stock_out: Package,
  stock_restored: CheckCircle,
  default: RefreshCw,
};

const changeTypeColors: Record<string, { bg: string; text: string }> = {
  price_increase: { bg: "bg-red-100", text: "text-red-800" },
  price_decrease: { bg: "bg-green-100", text: "text-green-800" },
  stock_low: { bg: "bg-amber-100", text: "text-amber-800" },
  stock_out: { bg: "bg-red-100", text: "text-red-800" },
  stock_restored: { bg: "bg-green-100", text: "text-green-800" },
  default: { bg: "bg-gray-100", text: "text-gray-800" },
};

export default function DailySyncPage() {
  const [changes, setChanges] = useState<SyncChange[]>([]);
  const [stats, setStats] = useState<SyncStats>({
    pending: 0,
    applied: 0,
    dismissed: 0,
    price_changes: 0,
    stock_changes: 0,
    out_of_stock: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [fixingVariants, setFixingVariants] = useState(false);
  const [variantFixResult, setVariantFixResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sync/changes?status=${statusFilter}`);
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to fetch changes");
      }
      
      setChanges(data.changes || []);
      setStats(data.stats || {});
      setLastSyncTime(data.lastSync || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load sync changes");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const runSync = async () => {
    setSyncing(true);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/sync/run", {
        method: "POST",
      });
      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Sync failed");
      }
      
      fetchChanges();
    } catch (e: any) {
      setError(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleAction = async (id: number, action: "apply" | "dismiss") => {
    try {
      const res = await fetch("/api/admin/sync/changes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Action failed");
      }
      
      fetchChanges();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    }
  };

  const applyAll = async () => {
    if (!confirm("Apply all pending changes?")) return;
    
    try {
      const res = await fetch("/api/admin/sync/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply_all" }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Action failed");
      }
      
      fetchChanges();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    }
  };

  const fixVariantData = async () => {
    if (!confirm("This will resync variant data (colors, sizes, stock) for all products from CJ. This may take a few minutes. Continue?")) return;
    
    setFixingVariants(true);
    setVariantFixResult(null);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/cj/resync/bulk", {
        method: "POST",
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Variant resync failed");
      }
      
      setVariantFixResult({
        success: true,
        message: `Successfully updated ${data.updated} of ${data.total} products. ${data.failed} failed.`,
      });
    } catch (e: any) {
      setVariantFixResult({
        success: false,
        message: e?.message || "Variant resync failed",
      });
    } finally {
      setFixingVariants(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Sync</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor price and stock changes from CJ</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncTime && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Last sync: {new Date(lastSyncTime).toLocaleString()}
            </span>
          )}
          <button
            onClick={runSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run Sync Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <button
          onClick={() => setStatusFilter("pending")}
          className={`p-4 rounded-xl border-2 transition-all ${
            statusFilter === "pending" ? "border-amber-500 bg-amber-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <Clock className="h-5 w-5 text-amber-600" />
            <span className="text-xl font-bold text-gray-900">{stats.pending}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Pending</p>
        </button>
        
        <button
          onClick={() => setStatusFilter("applied")}
          className={`p-4 rounded-xl border-2 transition-all ${
            statusFilter === "applied" ? "border-green-500 bg-green-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-xl font-bold text-gray-900">{stats.applied}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Applied</p>
        </button>

        <div className="p-4 rounded-xl border bg-white">
          <div className="flex items-center justify-between">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">{stats.price_changes}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Price Changes</p>
        </div>

        <div className="p-4 rounded-xl border bg-white">
          <div className="flex items-center justify-between">
            <Package className="h-5 w-5 text-purple-600" />
            <span className="text-xl font-bold text-gray-900">{stats.stock_changes}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Stock Changes</p>
        </div>

        <div className="p-4 rounded-xl border bg-white">
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-xl font-bold text-gray-900">{stats.out_of_stock}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Out of Stock</p>
        </div>

        <div className="p-4 rounded-xl border bg-white">
          <div className="flex items-center justify-between">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="text-xl font-bold text-gray-900">{new Date().toLocaleDateString("en-SA")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Today</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-600" />
              Fix Variant Data
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Resync all product colors, sizes, and stock from CJ to fix locked size buttons
            </p>
          </div>
          <button
            onClick={fixVariantData}
            disabled={fixingVariants}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {fixingVariants ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            {fixingVariants ? "Fixing..." : "Fix All Products"}
          </button>
        </div>
        {variantFixResult && (
          <div className={`mt-4 rounded-lg p-3 text-sm ${variantFixResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {variantFixResult.message}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {stats.pending > 0 && statusFilter === "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-amber-800">{stats.pending} changes require review</span>
          </div>
          <button
            onClick={applyAll}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700"
          >
            Apply All Updates
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            Loading changes...
          </div>
        ) : changes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-gray-900">All synced!</p>
            <p className="text-sm mt-1">No {statusFilter} changes to review</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {changes.map((change) => {
                const Icon = changeTypeIcons[change.change_type] || changeTypeIcons.default;
                const colors = changeTypeColors[change.change_type] || changeTypeColors.default;
                
                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-500">{change.cj_product_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                        <Icon className="h-3 w-3" />
                        {change.change_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {change.field_changed}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 line-through text-sm">{change.old_value}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="text-green-600 font-medium text-sm">{change.new_value}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(change.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {change.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAction(change.id, "apply")}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => handleAction(change.id, "dismiss")}
                            className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      {change.status === "applied" && (
                        <span className="text-green-600 text-xs flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Applied
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-medium text-blue-900 mb-2">Automatic Sync Schedule</h3>
        <p className="text-sm text-blue-700">
          The system automatically checks for price and stock changes every day at 8:00 AM (KSA time).
          Products with 0 stock are automatically hidden from the store.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <p className="text-gray-500">Stock Check</p>
            <p className="font-medium text-gray-900">Every 4 hours</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-gray-500">Price Check</p>
            <p className="font-medium text-gray-900">Daily at 8:00 AM</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-gray-500">Safety Buffer</p>
            <p className="font-medium text-gray-900">Stock - 5 units</p>
          </div>
        </div>
      </div>
    </div>
  );
}
