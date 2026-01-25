import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import type { Order } from "@/lib/types";

export const metadata = { title: "Account" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("id,created_at,total_amount,status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allOrders = (orders || []) as Order[];
  const counts = allOrders.reduce(
    (acc, o) => {
      acc.all += 1;
      acc[o.status as keyof typeof acc] = (acc[o.status as keyof typeof acc] || 0) + 1;
      return acc;
    },
    { all: 0, paid: 0, processing: 0, shipped: 0, delivered: 0, returned: 0 } as Record<string, number>
  );

  const lastOrder = allOrders[0];

  const tiles: { href: any; label: string; value: number }[] = [
    { href: { pathname: "/account/orders" }, label: "All Orders", value: counts.all },
    { href: { pathname: "/account/orders", query: { status: "paid" } }, label: "Paid", value: counts.paid || 0 },
    { href: { pathname: "/account/orders", query: { status: "processing" } }, label: "Processing", value: counts.processing || 0 },
    { href: { pathname: "/account/orders", query: { status: "shipped" } }, label: "Shipped", value: counts.shipped || 0 },
    { href: { pathname: "/account/orders", query: { status: "delivered" } }, label: "Delivered", value: counts.delivered || 0 },
    { href: { pathname: "/account/orders", query: { status: "returned" } }, label: "Returned", value: counts.returned || 0 },
  ];

  return (
    <div className="py-10">
      <h1 className="text-3xl font-bold mb-2">Account Overview</h1>
      <p className="text-slate-600 mb-6">Welcome back! Manage your orders and settings.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-xl border bg-white p-5 hover:shadow-sm transition">
            <div className="text-sm text-gray-500">{t.label}</div>
            <div className="text-2xl font-bold">{t.value}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-lg font-semibold mb-1">Signed In</h3>
          <p className="text-slate-700">{user.email}</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-lg font-semibold mb-3">Last Order</h3>
          {lastOrder ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Order #{lastOrder.id}</p>
              <p className="text-sm text-gray-600">{format(new Date(lastOrder.created_at), "MMMM d, yyyy")}</p>
              <p className="font-medium">{formatCurrency(lastOrder.total_amount)}</p>
              <Link className="text-sm text-blue-600 hover:underline" href={{ pathname: "/account/orders", query: { status: lastOrder.status } }}>View similar orders</Link>
            </div>
          ) : (
            <p className="text-gray-600">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
