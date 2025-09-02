import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = { title: "Account" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-bold">Your Account</h1>
      <p className="mt-2 text-slate-600">Manage your account settings.</p>
      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Email Address</h3>
        <p className="mt-1 text-slate-700">{session.user.email}</p>
      </div>
    </div>
  );
}
