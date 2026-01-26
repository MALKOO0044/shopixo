import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
<<<<<<< HEAD
import { RefreshCw, Clock, Package, ShoppingCart, AlertTriangle, CheckCircle, XCircle, ArrowRight, TrendingUp, Boxes, Calendar, Zap } from "lucide-react";
=======
import { RefreshCw, Clock, Package, ShoppingCart, AlertTriangle, CheckCircle, XCircle, ArrowRight } from "lucide-react";
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

export const metadata = {
  title: "Admin Dashboard - Shopixo",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getCJStatus() {
  const apiKey = process.env.CJ_API_KEY;
  if (!apiKey) return { connected: false, error: "API key not configured", latency: 0 };
  
  try {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data: tokenData } = await admin
        .from("integration_tokens")
        .select("access_token, access_expiry, updated_at")
        .eq("provider", "cj")
        .maybeSingle();
      
      if (tokenData?.access_token) {
        const isValid = !tokenData.access_expiry || new Date(tokenData.access_expiry) > new Date();
        const lastUpdate = tokenData.updated_at ? new Date(tokenData.updated_at) : null;
        const ageMs = lastUpdate ? Date.now() - lastUpdate.getTime() : 0;
        
        return { 
          connected: isValid, 
          error: isValid ? null : "Token expired", 
          latency: Math.min(ageMs / 1000, 999)
        };
      }
    }
    
    return { connected: false, error: "Not authenticated yet", latency: 0 };
  } catch (e: any) {
    return { connected: false, error: e?.message || "Status check failed", latency: 0 };
  }
}

<<<<<<< HEAD
function getToday() {
  return new Date().toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

=======
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
export default async function AdminDashboard() {
  const supabase = createServerComponentClient({ cookies });

  const [
    { data: products },
    { data: orders },
    { data: queueItems },
    { data: syncChanges },
    { data: jobs },
    cjStatus
  ] = await Promise.all([
<<<<<<< HEAD
    supabase.from("products").select("id, active, stock, created_at").not("metadata->cj_product_id", "is", null),
    supabase.from("orders").select("id, status, total_amount, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("product_queue").select("id, status, created_at"),
=======
    supabase.from("products").select("id, active, stock").not("metadata->cj_product_id", "is", null),
    supabase.from("orders").select("id, status, total").order("created_at", { ascending: false }).limit(5),
    supabase.from("product_queue").select("id, status"),
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    supabase.from("daily_sync_changes").select("id, change_type, status").eq("status", "pending").limit(10),
    supabase.from("import_logs").select("id, action, status, created_at").order("created_at", { ascending: false }).limit(5),
    getCJStatus(),
  ]);

  const totalProducts = products?.length || 0;
  const activeProducts = products?.filter(p => p.active)?.length || 0;
  const pendingOrders = orders?.filter(o => o.status === "pending")?.length || 0;
<<<<<<< HEAD
  const paidOrders = orders?.filter(o => o.status === "paid")?.length || 0;
  const processingOrders = orders?.filter(o => o.status === "processing")?.length || 0;
  const shippedOrders = orders?.filter(o => o.status === "shipped")?.length || 0;
  const deliveredOrders = orders?.filter(o => o.status === "delivered")?.length || 0;
  const returnedOrders = orders?.filter(o => o.status === "returned")?.length || 0;
  
  const pendingReview = queueItems?.filter(i => i.status === "pending" || i.status === "pending_review")?.length || 0;
  const queueApproved = queueItems?.filter(i => i.status === "approved")?.length || 0;
  const importedCount = queueItems?.filter(i => i.status === "imported")?.length || 0;
  
  const pendingChanges = syncChanges?.length || 0;
  const priceChanges = syncChanges?.filter(c => c.change_type?.includes("price"))?.length || 0;
  const stockChanges = syncChanges?.filter(c => c.change_type?.includes("stock"))?.length || 0;
  
  const inStockProducts = products?.filter(p => (p.stock || 0) > 10)?.length || 0;
  const lowStockProducts = products?.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10)?.length || 0;
  const outOfStockProducts = products?.filter(p => (p.stock || 0) === 0)?.length || 0;
  
  const totalOrderValue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
=======
  const pendingReview = queueItems?.filter(i => i.status === "pending" || i.status === "pending_review")?.length || 0;
  const queueCount = queueItems?.filter(i => i.status === "approved")?.length || 0;
  const importedCount = queueItems?.filter(i => i.status === "imported")?.length || 0;
  const pendingChanges = syncChanges?.length || 0;
  const priceChanges = syncChanges?.filter(c => c.change_type?.includes("price"))?.length || 0;
  const stockChanges = syncChanges?.filter(c => c.change_type?.includes("stock"))?.length || 0;
  const lowStockProducts = products?.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10)?.length || 0;
  const outOfStockProducts = products?.filter(p => (p.stock || 0) === 0)?.length || 0;
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your store performance and alerts</p>
        </div>
        <Link 
          href="/admin/import/discover"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
        >
          <Package className="h-4 w-4" />
          Import Products
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
<<<<<<< HEAD
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
=======
        <div className="bg-white rounded-xl border border-gray-200 p-4">
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <RefreshCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sync Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{pendingChanges}</p>
              <p className="text-xs text-gray-400">price {priceChanges}, stock {stockChanges}</p>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
=======
        <div className="bg-white rounded-xl border border-gray-200 p-4">
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Import Queue</p>
<<<<<<< HEAD
              <p className="text-2xl font-bold text-gray-900">{queueApproved}</p>
=======
              <p className="text-2xl font-bold text-gray-900">{queueCount}</p>
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
              <p className="text-xs text-gray-400">ready to import</p>
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
=======
        <div className="bg-white rounded-xl border border-gray-200 p-4">
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
<<<<<<< HEAD
              <p className="text-xs text-gray-400">SAR {totalOrderValue.toFixed(0)} total</p>
=======
              <p className="text-xs text-gray-400">SAR {orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0} total</p>
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
=======
        <div className="bg-white rounded-xl border border-gray-200 p-4">
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
              <p className="text-xs text-gray-400">{activeProducts} active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Daily Sync Changes</h3>
          <div className="flex items-center gap-2 mb-4">
            {pendingChanges === 0 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">No Pending Changes</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-gray-600">{pendingChanges} pending changes</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">All synced and up to date</p>
          <Link href="/admin/sync" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" />
            Manage Sync
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Stock Alerts</h3>
          <div className="flex items-center gap-2 mb-4">
            {lowStockProducts === 0 && outOfStockProducts === 0 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600">All Good</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-amber-600">{lowStockProducts + outOfStockProducts} alerts</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {lowStockProducts === 0 && outOfStockProducts === 0 
              ? "No stock alerts at this time" 
              : `${lowStockProducts} low stock, ${outOfStockProducts} out of stock`}
          </p>
          <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowRight className="h-4 w-4" />
            Manage Inventory
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">CJ Dropshipping Status</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-gray-400">{cjStatus.latency || 0}ms</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${cjStatus.connected ? "text-green-600" : "text-red-600"}`}>
                {cjStatus.connected ? "Connected" : "Disconnected"}
              </span>
              {cjStatus.connected ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          {cjStatus.error && (
            <p className="text-xs text-red-500 mb-2">{cjStatus.error}</p>
          )}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-red-500">{pendingReview}</span>
              <span className="text-gray-500">Pending Review</span>
            </div>
            <div className="flex justify-between">
<<<<<<< HEAD
              <span className="text-amber-500">{queueApproved}</span>
=======
              <span className="text-amber-500">{queueCount}</span>
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
              <span className="text-gray-500">Ready to Import</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-500">{importedCount || totalProducts}</span>
              <span className="text-gray-500">Imported</span>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/admin/import/queue" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
              <ArrowRight className="h-4 w-4" />
              View Queue
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Jobs</h3>
            <Link href="/admin/jobs" className="text-sm text-amber-600 hover:text-amber-700">View All</Link>
          </div>
          {jobs && jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{job.action}</span>
<<<<<<< HEAD
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
=======
                  <span className={`px-2 py-0.5 rounded text-xs ${
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
                    job.status === "success" ? "bg-green-100 text-green-700" :
                    job.status === "partial" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
<<<<<<< HEAD
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No jobs yet</p>
              <p className="text-xs text-gray-400">Background jobs will appear here when tasks are running</p>
            </div>
=======
            <p className="text-sm text-gray-400 text-center py-4">No jobs run yet</p>
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <Link href="/admin/orders" className="text-sm text-amber-600 hover:text-amber-700">View All</Link>
          </div>
          {orders && orders.length > 0 ? (
            <div className="space-y-3">
<<<<<<< HEAD
              {orders.slice(0, 5).map((order: any) => (
=======
              {orders.map((order: any) => (
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Order #{order.id.slice(0, 8)}</span>
                  <span className="text-gray-900 font-medium">SAR {order.total}</span>
                </div>
              ))}
            </div>
          ) : (
<<<<<<< HEAD
            <div className="text-center py-8">
              <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No orders yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Automatic Sync Schedule</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-4 w-4" />
            {getToday()}
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          The system automatically checks for price and stock changes every day at 8:00 AM (KSA time). Products with 0 stock are automatically hidden from the store.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Stock Check</p>
            <p className="text-sm font-medium text-gray-900">Every 4 hours</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Price Check</p>
            <p className="text-sm font-medium text-gray-900">Daily at 8:00 AM</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Safety Buffer</p>
            <p className="text-sm font-medium text-gray-900">Stock - 5 units</p>
          </div>
        </div>
      </div>
=======
            <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
          )}
        </div>
      </div>
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    </div>
  );
}
