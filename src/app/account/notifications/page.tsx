import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateNotifications } from "@/lib/notification-actions";
import SubmitButton from "@/components/submit-button";
import FormStatusToast from "@/components/form-status-toast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotificationsPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/notifications");

  const meta = (user.user_metadata || {}) as any;
  const prefs = (meta.notifications || {}) as { order_updates?: boolean; promotions?: boolean; product_updates?: boolean };

  return (
    <div dir="rtl" className="max-w-3xl mx-auto py-12 px-4 text-right">
      <h1 className="text-2xl font-bold mb-6">الإشعارات</h1>
      <div className="rounded-lg border bg-white p-6">
        <form action={updateNotifications} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">إشعارات البريد الإلكتروني</h2>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name="order_updates" defaultChecked={!!prefs.order_updates} className="h-4 w-4" />
              <span>تحديثات الطلب (تغييرات الحالة، معلومات الشحن)</span>
            </label>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name="promotions" defaultChecked={!!prefs.promotions} className="h-4 w-4" />
              <span>العروض الترويجية والعروض الخاصة</span>
            </label>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name="product_updates" defaultChecked={!!prefs.product_updates} className="h-4 w-4" />
              <span>تحديثات المنتجات وتنبيهات عودة التوفر</span>
            </label>
          </div>
          <SubmitButton label="حفظ التفضيلات" pendingLabel="جارٍ الحفظ..." />
          <FormStatusToast successMessage="تم حفظ التفضيلات" />
        </form>
        <p className="text-xs text-gray-500 mt-3">يمكنك إلغاء الاشتراك من رسائل التسويق في أي وقت. لا يمكن تعطيل رسائل المعاملات.</p>
      </div>
    </div>
  );
}
