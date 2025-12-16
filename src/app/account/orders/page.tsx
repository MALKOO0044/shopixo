import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserOrders(userId: string, status?: string): Promise<Order[]> {
  const supabase = createServerComponentClient({ cookies });
  let query = supabase
    .from("orders")
    .select(`
      id,
      created_at,
      total_amount,
      status
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
  return data as Order[];
}

export default async function UserOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/orders");
  }

  const currentStatus = (searchParams?.status || "all").toLowerCase();
  const orders = await getUserOrders(user.id, currentStatus);

  const statuses: { key: string; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
    { key: "returned", label: "Returned" },
  ];

  const statusLabelMap: Record<string, string> = {
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    returned: "Returned",
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-4">My Orders</h1>
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map((s) => {
          const linkHref = s.key === "all"
            ? { pathname: "/account/orders" }
            : { pathname: "/account/orders", query: { status: s.key } };
          const isActive = currentStatus === s.key || (s.key === "all" && currentStatus === "all");
          return (
            <Link
              key={s.key}
              href={linkHref}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                isActive ? "bg-black text-white border-black" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
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
                  {statusLabelMap[order.status] || order.status}
                </span>
              </div>
              <div>
                <p className="text-lg font-medium">
                  Total: {formatCurrency(order.total_amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
