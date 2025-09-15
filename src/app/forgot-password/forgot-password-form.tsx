"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useSearchParams } from "next/navigation"
import { useState, useTransition, useEffect } from "react"

export default function ForgotPasswordForm() {
  const supabase = createClientComponentClient()
  const params = useSearchParams()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const e = params?.get("email") || ""
    if (e) setEmail(e)
  }, [params])

  const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : (typeof window !== "undefined" ? window.location.origin : "")
  const nextParam = (params?.get("redirect") || params?.get("next") || "/").toString()
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"
  const targetAfterCallback = safeNext && safeNext !== "/" ? `/reset-password?next=${encodeURIComponent(safeNext)}` : "/reset-password"
  const redirectTo = base ? `${base.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(targetAfterCallback)}` : `/auth/callback?next=${encodeURIComponent(targetAfterCallback)}`

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    if (!email) { setError("الرجاء إدخال البريد الإلكتروني"); return }
    startTransition(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) setError(error.message)
      else setMessage(`تم إرسال رابط إعادة التعيين إلى ${email}. الرجاء فحص بريدك.`)
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
      <h2 className="text-center text-2xl font-bold">استعادة كلمة المرور</h2>
      <div className="grid gap-2">
        <label className="text-sm">البريد الإلكتروني</label>
        <input type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-full border px-4 py-3" placeholder="example@email.com" />
      </div>
      <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">إرسال رابط إعادة التعيين</button>
      {message && <div className="rounded-md border border-emerald-500 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
    </form>
  )
}
