import { getStripe } from "@/lib/stripe";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { clearCart } from "@/lib/cart-actions";
import Link from "next/link";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CheckoutSuccessPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const sessionIdParam = searchParams?.session_id;
  const sessionId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;

  if (!sessionId) {
    return (
      <div className="container text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">خطأ</h1>
        <p className="mt-2">لا يوجد معرف جلسة.</p>
      </div>
    );
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await clearCart();
    }

    return (
      <div className="container text-center py-12">
        <h1 className="text-3xl font-bold text-green-600">تم الدفع بنجاح!</h1>
        <p className="mt-4">شكرًا لطلبك، {session.customer_details?.email}.</p>
        <p className="mt-2">تم إرسال رسالة تأكيد إلى بريدك الإلكتروني.</p>
        <Link href="/" className="btn-primary mt-6 inline-block">متابعة التسوق</Link>
      </div>
    );
  } catch (error) {
    return (
      <div className="container text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">خطأ</h1>
        <p className="mt-2">الجلسة غير صالحة. يرجى المحاولة مرة أخرى.</p>
      </div>
    );
  }
}
