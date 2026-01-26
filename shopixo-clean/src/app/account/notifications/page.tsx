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
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="rounded-lg border bg-white p-6">
        <form action={updateNotifications} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Email Notifications</h2>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name="order_updates" defaultChecked={!!prefs.order_updates} className="h-4 w-4" />
              <span>Order updates (status changes, shipping info)</span>
            </label>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name="promotions" defaultChecked={!!prefs.promotions} className="h-4 w-4" />
              <span>Promotions and special offers</span>
            </label>
            <label className="flex items-center gap-3 py-2">
              <input type="checkbox" name="product_updates" defaultChecked={!!prefs.product_updates} className="h-4 w-4" />
              <span>Product updates and back-in-stock alerts</span>
            </label>
          </div>
          <SubmitButton label="Save Preferences" pendingLabel="Saving..." />
          <FormStatusToast successMessage="Preferences saved" />
        </form>
        <p className="text-xs text-gray-500 mt-3">You can unsubscribe from marketing emails at any time. Transactional emails cannot be disabled.</p>
      </div>
    </div>
  );
}
