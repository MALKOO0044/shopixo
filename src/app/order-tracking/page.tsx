import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
export const metadata = { title: "Order Tracking" };
export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const getFirst = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) ?? "";

  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/order-tracking");

  const idParam = getFirst(searchParams?.id);
  const orderId = idParam ? Number(idParam) : undefined;

  let order: any | null = null;
  if (orderId && Number.isFinite(orderId)) {
    const { data } = await supabase
      .from("orders")
      .select("id, status, total_amount, created_at")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    order = data || null;
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Order Tracking</h1>
      <p className="mt-2 text-slate-600">Enter your order number to see the latest status.</p>
      <div className="mt-6 max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <form method="get" className="flex gap-2">
          <input name="id" defaultValue={idParam} placeholder="Order Number" className="w-full rounded-md border px-3 py-2" />
          <button className="btn-primary" type="submit">Track</button>
        </form>

        {idParam && !order && (
          <div className="mt-4 text-sm text-red-600">No order found with this number for your account.</div>
        )}

        {order && (
          <div className="mt-4 text-sm text-slate-700">
            <div>Order Number: <span className="font-medium">#{order.id}</span></div>
            <div>Status: <span className="font-medium">{order.status}</span></div>
            <div>Total: <span className="font-medium">{formatCurrency(Number(order.total_amount || 0))}</span></div>
            <div>Date: <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
