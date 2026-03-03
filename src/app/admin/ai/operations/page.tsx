import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { 
  Zap, ArrowLeft, Package, ShoppingCart, RefreshCw,
  CheckCircle, Clock, AlertTriangle, Truck
} from "lucide-react";

export const metadata = {
  title: "Operations - Shopixo Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getOperationsData() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  try {
    const [
      { data: orders },
      { data: products },
      { data: syncChanges },
      { data: queueItems }
    ] = await Promise.all([
      admin.from('orders').select('id, status, total_amount, created_at, metadata').order('created_at', { ascending: false }).limit(50),
      admin.from('products').select('id, active, stock').not('metadata->cj_product_id', 'is', null),
      admin.from('daily_sync_changes').select('id, change_type, status').eq('status', 'pending'),
      admin.from('product_queue').select('id, status'),
    ]);

    const allOrders = orders || [];
    const allProducts = products || [];
    const pendingChanges = syncChanges || [];
    const queue = queueItems || [];

    return {
      orders: {
        total: allOrders.length,
        pending: allOrders.filter(o => o.status === 'pending').length,
        paid: allOrders.filter(o => o.status === 'paid').length,
        processing: allOrders.filter(o => o.status === 'processing').length,
        shipped: allOrders.filter(o => o.status === 'shipped').length,
        delivered: allOrders.filter(o => o.status === 'delivered').length,
        recent: allOrders.slice(0, 10),
      },
      products: {
        total: allProducts.length,
        active: allProducts.filter(p => p.active).length,
        inStock: allProducts.filter(p => (p.stock || 0) > 10).length,
        lowStock: allProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length,
        outOfStock: allProducts.filter(p => (p.stock || 0) === 0).length,
      },
      sync: {
        pendingChanges: pendingChanges.length,
        priceChanges: pendingChanges.filter(c => c.change_type?.includes('price')).length,
        stockChanges: pendingChanges.filter(c => c.change_type?.includes('stock')).length,
      },
      queue: {
        total: queue.length,
        pending: queue.filter(q => q.status === 'pending' || q.status === 'pending_review').length,
        approved: queue.filter(q => q.status === 'approved').length,
        imported: queue.filter(q => q.status === 'imported').length,
      },
    };
  } catch (e: any) {
    console.error('[Operations] Error:', e?.message);
    return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-blue-100 text-blue-700',
    processing: 'bg-purple-100 text-purple-700',
    shipped: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default async function OperationsPage() {
  const data = await getOperationsData();

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Unable to load operations data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/ai" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-600" />
              Operations
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Order fulfillment, sync status, and operational metrics
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Order Status</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">{data.orders.pending}</p>
              <p className="text-xs text-yellow-600">Pending</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{data.orders.paid}</p>
              <p className="text-xs text-blue-600">Paid</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{data.orders.processing}</p>
              <p className="text-xs text-purple-600">Processing</p>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-700">{data.orders.shipped}</p>
              <p className="text-xs text-indigo-600">Shipped</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{data.orders.delivered}</p>
              <p className="text-xs text-green-600">Delivered</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">{data.orders.total}</p>
              <p className="text-xs text-gray-600">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Inventory Status</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{data.products.inStock}</p>
              <p className="text-xs text-green-600">In Stock</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">{data.products.lowStock}</p>
              <p className="text-xs text-amber-600">Low Stock</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{data.products.outOfStock}</p>
              <p className="text-xs text-red-600">Out of Stock</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{data.products.active}</p>
              <p className="text-xs text-blue-600">Active</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg col-span-2">
              <p className="text-2xl font-bold text-gray-700">{data.products.total}</p>
              <p className="text-xs text-gray-600">Total Products</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Sync Status</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Pending Changes</span>
              <span className="font-bold text-purple-600">{data.sync.pendingChanges}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Price Changes</span>
              <span className="font-bold text-amber-600">{data.sync.priceChanges}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Stock Changes</span>
              <span className="font-bold text-blue-600">{data.sync.stockChanges}</span>
            </div>
            <Link 
              href="/admin/sync"
              className="block w-full text-center py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              View Sync Dashboard
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Import Queue</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total in Queue</span>
              <span className="font-bold text-gray-700">{data.queue.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Pending Review</span>
              <span className="font-bold text-yellow-600">{data.queue.pending}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Approved</span>
              <span className="font-bold text-blue-600">{data.queue.approved}</span>
            </div>
            <Link 
              href="/admin/import/queue"
              className="block w-full text-center py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              View Import Queue
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Orders</h3>
          <Link href="/admin/orders" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Order ID</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.orders.recent.length > 0 ? (
                data.orders.recent.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${order.total_amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <Link 
                        href={`/admin/orders`}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">No orders yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
