import ResetPasswordForm from "./reset-password-form"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const metadata = { title: "Set New Password" }
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ResetPasswordPage() {
  const supabase = createServerComponentClient({ cookies })
  const { data } = await supabase.auth.getSession()
  if (!data?.session) {
    // If user isn't authenticated after recovery, send back to login
    redirect("/login")
  }
  return (
    <div className="container flex min-h-[70vh] w-full flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <ResetPasswordForm />
      </div>
    </div>
  )
}
