import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "@/app/login/auth-form";

export const metadata = { title: "إنشاء حساب" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SignUpPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    redirect("/");
  }

  return (
    <main className="container max-w-lg py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">إنشاء حساب أو تسجيل الدخول</h1>
      <AuthForm />
    </main>
  );
}
