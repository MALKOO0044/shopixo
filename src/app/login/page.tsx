import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForm from "./auth-form";

export const metadata = {
  title: "Log In",
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
    <div className="container flex h-full w-full flex-col items-center justify-center py-10">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-center text-2xl font-bold">Log In to Shopixo</h1>
        <AuthForm />
      </div>
    </div>
  );
}
