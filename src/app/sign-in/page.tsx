import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SignInForm from "./sign-in-form";

export default async function SignInPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.auth.getSession();

  if (data?.session) {
    redirect("/");
  }

  return (
    <main className="container max-w-lg py-12">
      <h1 className="mb-6 text-center text-2xl font-bold">Sign In</h1>
      <SignInForm />
    </main>
  );
}
