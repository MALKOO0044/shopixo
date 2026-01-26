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
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Account Security</h1>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-3">Change Password</h2>
        <PasswordForm action={updatePassword} />
        <p className="mt-3 text-xs text-gray-500">After changing your password, you may be asked to sign in again on other devices.</p>
      </div>
    </div>
  );
}
