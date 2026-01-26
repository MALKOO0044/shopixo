import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import Link from "next/link";
import type { Order } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import OrderStatusForm from "@/app/admin/orders/status-form";
import { AdminFulfillCjButton } from "@/components/admin-fulfill-cj-button";
import { ShoppingCart, Package, Truck, CheckCircle, RotateCcw, Clock, CreditCard } from "lucide-react";

let supabaseAdmin: any = null;
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin as ReturnType<typeof createClient> | null;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getOrders(): Promise<Order[]> {
  const client = getSupabaseAdmin();
  if (!client) return [];
  const { data, error } = await client
    .from("orders")
    .select(`*`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
  return data as Order[];
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
    case "delivered":
      return "default";
    case "processing":
    case "shipped":
      return "secondary";
    case "returned":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

export default async function OrdersPage() {
  const orders = await getOrders();
  
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const paidOrders = orders.filter(o => o.status === "paid").length;
  const processingOrders = orders.filter(o => o.status === "processing").length;
  const shippedOrders = orders.filter(o => o.status === "shipped").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const returnedOrders = orders.filter(o => o.status === "returned").length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track customer orders</p>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-gray-900">{pendingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Paid</p>
              <p className="text-xl font-bold text-gray-900">{paidOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Processing</p>
              <p className="text-xl font-bold text-gray-900">{processingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Truck className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Shipped</p>
              <p className="text-xl font-bold text-gray-900">{shippedOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Delivered</p>
              <p className="text-xl font-bold text-gray-900">{deliveredOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <RotateCcw className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Returned</p>
              <p className="text-xl font-bold text-gray-900">{returnedOrders}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableCaption>A list of recent orders.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="hidden md:table-cell">User ID</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="hidden lg:table-cell">CJ Order</TableHead>
              <TableHead className="hidden lg:table-cell">Tracking</TableHead>
              <TableHead className="hidden lg:table-cell">Shipping</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No orders yet</p>
                  <p className="text-gray-400 text-sm mt-1">Orders will appear here when customers make purchases</p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono text-gray-500">
                    {order.user_id ? `${order.user_id.slice(0, 8)}...` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    SAR {(order.total_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                      <OrderStatusForm orderId={order.id} current={order.status} />
                      <AdminFulfillCjButton orderId={order.id} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs font-mono text-gray-500">
                    {order.cj_order_no || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">
                    {order.tracking_number || "—"}
                    {order.carrier ? ` (${order.carrier})` : ""}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs">
                    {order.shipping_status || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
