import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "./auth-form";

export const metadata = {
  title: "تسجيل الدخول أو إنشاء حساب",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    redirect("/");
  }

  return (
    <div className="container flex min-h-[70vh] w-full flex-col items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <AuthForm />
      </div>
    </div>
  );
}
