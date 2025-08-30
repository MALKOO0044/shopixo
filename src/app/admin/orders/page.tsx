import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
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

// Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getOrders(): Promise<Order[]> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(`id, created_at, total_amount, status, user_id`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
  return data as Order[];
}

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="rounded-md border">
        <Table>
          <TableCaption>A list of recent orders.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="hidden md:table-cell">User ID</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>
                  {format(new Date(order.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs font-mono">{order.user_id}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(order.total_amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
