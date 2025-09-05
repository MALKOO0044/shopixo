import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Address } from "@/lib/types";
import { createAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/lib/address-actions";
import SubmitButton from "@/components/submit-button";
import ConfirmSubmitButton from "@/components/confirm-submit-button";
import FormStatusToast from "@/components/form-status-toast";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AddressesPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/addresses");
  }

  const { data } = await supabase
    .from("addresses")
    .select("id,user_id,full_name,phone,line1,line2,city,state,postal_code,country,is_default,created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("id", { ascending: true });

  const addresses = (data || []) as Address[];

  return (
    <div dir="rtl" className="max-w-4xl mx-auto py-12 px-4 text-right">
      <h1 className="text-2xl font-bold mb-6">العناوين</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">إضافة عنوان جديد</h2>
          <form action={createAddress} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
              <input name="full_name" autoComplete="name" required className="w-full rounded border px-3 py-2" placeholder="اسمك" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
              <input name="phone" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" pattern="^\+?[0-9\s\-]{6,}$" className="w-full rounded border px-3 py-2" placeholder="اختياري" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العنوان سطر 1</label>
              <input name="line1" autoComplete="address-line1" required className="w-full rounded border px-3 py-2" placeholder="الشارع ورقم المنزل" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العنوان سطر 2</label>
              <input name="line2" autoComplete="address-line2" className="w-full rounded border px-3 py-2" placeholder="الشقة، الجناح، إلخ (اختياري)" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">المدينة</label>
                <input name="city" autoComplete="address-level2" required className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">المنطقة/المحافظة</label>
                <input name="state" autoComplete="address-level1" className="w-full rounded border px-3 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">الرمز البريدي</label>
                <input name="postal_code" dir="ltr" autoComplete="postal-code" inputMode="numeric" className="w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">الدولة</label>
                <input name="country" autoComplete="country" required className="w-full rounded border px-3 py-2" placeholder="مثال: SA، AE، US" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_default" className="h-4 w-4" />
              تعيين كافتراضي
            </label>
            <div>
              <SubmitButton label="حفظ العنوان" pendingLabel="جارٍ الحفظ..." />
            </div>
            <FormStatusToast successMessage="تم حفظ العنوان بنجاح" />
          </form>
        </div>

        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">العناوين المحفوظة</h2>
          {addresses.length === 0 ? (
            <p className="text-gray-600">لا توجد عناوين محفوظة بعد.</p>
          ) : (
            <ul className="space-y-4">
              {addresses.map((addr) => (
                <li key={addr.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{addr.full_name} {addr.is_default && <span className="mr-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">افتراضي</span>}</p>
                      <p className="text-sm text-gray-700">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                      <p className="text-sm text-gray-700">{addr.city}{addr.state ? `, ${addr.state}` : ""}{addr.postal_code ? `, ${addr.postal_code}` : ""}</p>
                      <p className="text-sm text-gray-700">{addr.country}{addr.phone ? ` • ${addr.phone}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!addr.is_default && (
                        <form action={setDefaultAddress}>
                          <input type="hidden" name="id" value={String(addr.id)} />
                          <SubmitButton label="تعيين كافتراضي" pendingLabel="جارٍ التعيين..." variant="secondary" className="px-3 py-1.5 text-sm" />
                          <FormStatusToast successMessage="تم تعيين العنوان كافتراضي" />
                        </form>
                      )}
                      <form action={deleteAddress}>
                        <input type="hidden" name="id" value={String(addr.id)} />
                        <ConfirmSubmitButton label="حذف" pendingLabel="جارٍ الحذف..." confirmMessage="هل أنت متأكد من حذف هذا العنوان؟" className="px-3 py-1.5 text-sm" />
                        <FormStatusToast successMessage="تم حذف العنوان" />
                      </form>
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-700 hover:text-black">تعديل العنوان</summary>
                    <form action={updateAddress} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="hidden" name="id" value={String(addr.id)} />
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
                        <input name="full_name" autoComplete="name" defaultValue={addr.full_name} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
                        <input name="phone" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" pattern="^\+?[0-9\s\-]{6,}$" defaultValue={addr.phone ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">العنوان سطر 1</label>
                        <input name="line1" autoComplete="address-line1" defaultValue={addr.line1} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium mb-1">العنوان سطر 2</label>
                        <input name="line2" autoComplete="address-line2" defaultValue={addr.line2 ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">المدينة</label>
                        <input name="city" autoComplete="address-level2" defaultValue={addr.city} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">المنطقة/المحافظة</label>
                        <input name="state" autoComplete="address-level1" defaultValue={addr.state ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">الرمز البريدي</label>
                        <input name="postal_code" dir="ltr" autoComplete="postal-code" inputMode="numeric" defaultValue={addr.postal_code ?? ""} className="w-full rounded border px-3 py-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">الدولة</label>
                        <input name="country" autoComplete="country" defaultValue={addr.country} required className="w-full rounded border px-3 py-2" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" name="is_default" defaultChecked={addr.is_default} className="h-4 w-4" />
                          تعيين كافتراضي
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <SubmitButton label="حفظ التغييرات" pendingLabel="جارٍ الحفظ..." />
                      </div>
                      <FormStatusToast successMessage="تم تحديث العنوان" />
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
