import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowRight,
  Database,
  Wifi,
  WifiOff
} from "lucide-react";

export const metadata = {
  title: "Admin Dashboard - Shopixo",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCjConnectionStatus() {
  try {
    const baseUrl = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";
    const apiKey = process.env.CJ_API_KEY || process.env.CJ_ACCESS_TOKEN;
    if (!apiKey) return { ok: false, message: "CJ API key not configured", latency: 0 };
    
    const start = Date.now();
    const res = await fetch(`${baseUrl}/product/list?pageSize=1&pageNum=1`, {
      headers: { "CJ-Access-Token": apiKey },
      cache: "no-store",
    });
    const latency = Date.now() - start;
    
    if (res.ok) {
      return { ok: true, message: "Connected", latency };
    }
    return { ok: false, message: `HTTP ${res.status}`, latency };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Connection failed", latency: 0 };
  }
}

export default async function AdminDashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [
    { data: products },
    { data: orders },
    { data: queueStats },
    { data: syncChanges },
    { data: recentJobs },
    cjStatus
  ] = await Promise.all([
    supabase.from("products").select("id, title, stock, price, is_active, created_at").order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, total, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("product_queue").select("status"),
    supabase.from("daily_sync_changes").select("id, change_type, status").eq("status", "pending"),
    supabase.from("admin_jobs").select("id, kind, status, created_at").order("created_at", { ascending: false }).limit(5),
    getCjConnectionStatus()
  ]);

  const productList = products || [];
  const orderList = orders || [];
  const queueList = queueStats || [];
  const pendingSyncChanges = syncChanges || [];
  const jobsList = recentJobs || [];

  const totalProducts = productList.length;
  const activeProducts = productList.filter(p => p.is_active !== false).length;
  const lowStockThreshold = 10;
  const lowStockProducts = productList.filter(p => (p.stock ?? 0) <= lowStockThreshold && p.is_active !== false);
  const outOfStockProducts = productList.filter(p => (p.stock ?? 0) === 0 && p.is_active !== false);

  const pendingQueue = queueList.filter(q => q.status === "pending").length;
  const approvedQueue = queueList.filter(q => q.status === "approved").length;
  const importedQueue = queueList.filter(q => q.status === "imported").length;

  const pendingOrders = orderList.filter(o => o.status === "pending").length;
  const totalRevenue = orderList.reduce((sum, o) => sum + (o.total || 0), 0);

  const priceChanges = pendingSyncChanges.filter(c => c.change_type === "price").length;
  const stockChanges = pendingSyncChanges.filter(c => c.change_type === "stock").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of your store performance and alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cj/import"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Package className="h-4 w-4" />
            Import Products
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{totalProducts}</p>
              <p className="text-xs text-gray-400 mt-1">{activeProducts} active</p>
            </div>
            <div className="rounded-full bg-blue-50 p-3">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{pendingOrders}</p>
              <p className="text-xs text-gray-400 mt-1">SAR {totalRevenue.toFixed(0)} total</p>
            </div>
            <div className="rounded-full bg-green-50 p-3">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Import Queue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{pendingQueue + approvedQueue}</p>
              <p className="text-xs text-gray-400 mt-1">{approvedQueue} ready to import</p>
            </div>
            <div className="rounded-full bg-amber-50 p-3">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sync Alerts</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{pendingSyncChanges.length}</p>
              <p className="text-xs text-gray-400 mt-1">{priceChanges} price, {stockChanges} stock</p>
            </div>
            <div className="rounded-full bg-purple-50 p-3">
              <RefreshCw className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-gray-900">CJ Dropshipping Status</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${cjStatus.ok ? "bg-green-100" : "bg-red-100"}`}>
                {cjStatus.ok ? (
                  <Wifi className="h-5 w-5 text-green-600" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {cjStatus.ok ? "Connected" : "Disconnected"}
                </p>
                <p className="text-sm text-gray-500">{cjStatus.message}</p>
              </div>
              {cjStatus.latency > 0 && (
                <span className="ml-auto text-sm text-gray-400">{cjStatus.latency}ms</span>
              )}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pending Review</span>
                <span className="font-medium text-amber-600">{pendingQueue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ready to Import</span>
                <span className="font-medium text-green-600">{approvedQueue}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Imported</span>
                <span className="font-medium text-blue-600">{importedQueue}</span>
              </div>
            </div>

            <Link
              href="/admin/cj/queue"
              className="flex items-center justify-center gap-2 w-full rounded-lg border py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Queue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Stock Alerts</h2>
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {lowStockProducts.length + outOfStockProducts.length} alerts
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            {outOfStockProducts.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-3">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Out of Stock</p>
                  <p className="text-sm text-red-600">{outOfStockProducts.length} products have 0 stock</p>
                </div>
              </div>
            )}

            {lowStockProducts.length > 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Low Stock</p>
                  <p className="text-sm text-amber-600">{lowStockProducts.length} products below {lowStockThreshold} units</p>
                </div>
              </div>
            )}

            {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
              <div className="flex items-start gap-3 rounded-lg bg-green-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">All Good</p>
                  <p className="text-sm text-green-600">No stock alerts at this time</p>
                </div>
              </div>
            )}

            <Link
              href={"/admin/inventory" as any}
              className="flex items-center justify-center gap-2 w-full rounded-lg border py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Manage Inventory <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Daily Sync Changes</h2>
            {pendingSyncChanges.length > 0 && (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {pendingSyncChanges.length} pending
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            {pendingSyncChanges.length > 0 ? (
              <>
                <div className="space-y-3">
                  {priceChanges > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        Price Changes
                      </span>
                      <span className="font-medium text-purple-600">{priceChanges}</span>
                    </div>
                  )}
                  {stockChanges > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-500" />
                        Stock Changes
                      </span>
                      <span className="font-medium text-purple-600">{stockChanges}</span>
                    </div>
                  )}
                </div>
                <Link
                  href={"/admin/sync" as any}
                  className="flex items-center justify-center gap-2 w-full rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Review Changes <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-600">No Pending Changes</p>
                  <p className="text-sm text-gray-500">All synced and up to date</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y">
            {orderList.length > 0 ? (
              orderList.slice(0, 5).map((order) => (
                <div key={order.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">SAR {(order.total || 0).toFixed(2)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.status === "completed" ? "bg-green-100 text-green-700" :
                      order.status === "pending" ? "bg-amber-100 text-amber-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-gray-500">
                No orders yet
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="border-b px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-sm text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="divide-y">
            {jobsList.length > 0 ? (
              jobsList.map((job) => (
                <div key={job.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{job.kind}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(job.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    job.status === "success" ? "bg-green-100 text-green-700" :
                    job.status === "error" ? "bg-red-100 text-red-700" :
                    job.status === "running" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-gray-500">
                No jobs run yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
