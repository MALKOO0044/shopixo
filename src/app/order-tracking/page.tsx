import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
export const metadata = { title: "تتبع الطلب" };
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
      <h1 className="text-3xl font-bold">تتبع الطلب</h1>
      <p className="mt-2 text-slate-600">أدخل رقم الطلب للاطلاع على آخر حالة.</p>
      <div className="mt-6 max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <form method="get" className="flex gap-2">
          <input name="id" defaultValue={idParam} placeholder="رقم الطلب" className="w-full rounded-md border px-3 py-2" />
          <button className="btn-primary" type="submit">تتبع</button>
        </form>

        {idParam && !order && (
          <div className="mt-4 text-sm text-red-600">لم يتم العثور على طلب بهذا الرقم لحسابك.</div>
        )}

        {order && (
          <div className="mt-4 text-sm text-slate-700">
            <div>رقم الطلب: <span className="font-medium">#{order.id}</span></div>
            <div>الحالة: <span className="font-medium">{order.status}</span></div>
            <div>الإجمالي: <span className="font-medium">{formatCurrency(Number(order.total_amount || 0))}</span></div>
            <div>التاريخ: <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
