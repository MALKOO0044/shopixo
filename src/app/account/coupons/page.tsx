import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getStripe } from "@/lib/stripe";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CouponUsage = {
  orderId: number;
  createdAt: string;
  code: string;
  label: string;
  amountSaved: number; // in major units
  currency: string; // e.g. 'usd'
};

export default async function CouponsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/coupons");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, stripe_session_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  const stripe = hasStripeKey ? getStripe() : null;

  const usages: CouponUsage[] = [];
  for (const o of orders || []) {
    const sessionId = (o as any).stripe_session_id as string | null;
    if (!sessionId || !stripe) continue;
    try {
      const session: any = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: [
          "total_details.breakdown.discounts.discount.coupon",
          "total_details.breakdown.discounts.discount.promotion_code",
        ],
      });

      const currency: string = session.currency || "usd";
      const totalDetails = session.total_details || {};
      const amountDiscountCents: number = totalDetails.amount_discount || 0;
      const amountSaved = amountDiscountCents / 100;

      // Attempt to extract a human-readable code/label
      let code = "";
      let label = "Discount";
      const breakdownDiscounts = totalDetails.breakdown?.discounts || [];
      if (breakdownDiscounts.length > 0) {
        const first = breakdownDiscounts[0];
        const discount = first.discount;
        const pc = discount?.promotion_code;
        const coupon = discount?.coupon;
        if (pc && typeof pc === "object" && pc.code) {
          code = pc.code;
          label = coupon?.name || pc.code || "Promotion";
        } else if (coupon && typeof coupon === "object") {
          // No promo code object, but coupon exists
          label = coupon.name || "Coupon";
          code = coupon.id || label;
        }
      }

      if (amountSaved > 0) {
        usages.push({
          orderId: (o as any).id as number,
          createdAt: (o as any).created_at as string,
          code: code || label,
          label: label || "Discount",
          amountSaved,
          currency,
        });
      }
    } catch (e) {
      // Ignore sessions we cannot retrieve (might be deleted in test mode).
      console.warn("Failed to retrieve Stripe session for coupons page", { sessionId, e });
    }
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto py-12 px-4 text-right">
      <h1 className="text-2xl font-bold mb-6">القسائم والعروض</h1>
      {!hasStripeKey ? (
        <div className="rounded-lg border bg-white p-6">
          <p className="text-gray-700">يمكن استخدام أكواد الخصم عند إتمام الشراء. لا تتوفر سجلات القسائم لأن Stripe غير مهيّأ في هذه البيئة.</p>
        </div>
      ) : usages.length === 0 ? (
        <div className="rounded-lg border bg-white p-6">
          <p className="text-gray-700">لم يتم استخدام أي أكواد خصم بعد. يمكنك إدخال كود أثناء الدفع عند توفره.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">العروض المطبّقة</h2>
          <ul className="divide-y">
            {usages.map((u) => (
              <li key={u.orderId} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{u.label}</p>
                  <p className="text-sm text-gray-600">طلب رقم #{u.orderId} • {format(new Date(u.createdAt), "d MMM yyyy", { locale: arSA })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">الكود</p>
                  <p className="font-semibold">{u.code}</p>
                  <p className="text-sm text-green-700">تم التوفير {formatCurrency(u.amountSaved, (u.currency || "USD").toUpperCase(), "ar-SA")}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
