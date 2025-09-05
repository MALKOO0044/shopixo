import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updatePassword } from "@/lib/security-actions";
import PasswordForm from "@/components/account/password-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SecurityPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/security");

  return (
    <div dir="rtl" className="max-w-3xl mx-auto py-12 px-4 text-right">
      <h1 className="text-2xl font-bold mb-6">أمان الحساب</h1>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">تغيير كلمة المرور</h2>
        <PasswordForm action={updatePassword} />
        <p className="mt-3 text-xs text-gray-500">بعد تغيير كلمة المرور، قد يُطلب منك تسجيل الدخول مرة أخرى على الأجهزة الأخرى.</p>
      </div>
    </div>
  );
}
