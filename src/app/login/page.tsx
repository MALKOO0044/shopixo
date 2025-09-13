import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "./auth-form";

export const metadata = {
  title: "إنشاء حساب أو تسجيل الدخول",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.auth.getSession();
  const nextParam = (typeof searchParams?.next === "string" ? searchParams?.next : undefined) || 
    (typeof searchParams?.redirect === "string" ? searchParams?.redirect : undefined);
  const next = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : "/";

  if (data?.session) {
    redirect(next);
  }

  return (
    <div className="container flex h-full w-full flex-col items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-center text-2xl font-bold">إنشاء حساب أو تسجيل الدخول</h1>
        <AuthForm next={next} />
      </div>
    </div>
  );
}
