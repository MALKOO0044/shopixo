import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserOrders(userId: string): Promise<Order[]> {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      created_at,
      total_amount,
      status
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
  return data as Order[];
}

export default async function UserOrdersPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/orders");
  }

  const orders = await getUserOrders(user.id);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>
      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white shadow-md rounded-lg p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-lg font-semibold">Order #{order.id}</h2>
                  <p className="text-sm text-gray-500">
                    {format(new Date(order.created_at), "MMMM d, yyyy")}
                  </p>
                </div>
                <span className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-100 rounded-full">
                  {order.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium">
                  Total: {formatCurrency(order.total_amount)}
                </p>
              </div>
              {/* You could add a link to an order details page here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
