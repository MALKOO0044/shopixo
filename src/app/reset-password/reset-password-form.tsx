"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"

export default function ResetPasswordForm() {
  const supabase = createClientComponentClient()
  const params = useSearchParams()
  const nextParam = (params?.get("next") || params?.get("redirect") || "/").toString()
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    if (password.length < 8) { setError("الرجاء إدخال كلمة مرور لا تقل عن 8 أحرف"); return }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتين"); return }

    startTransition(async () => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) setError(error.message)
      else {
        setMessage("تم تحديث كلمة المرور بنجاح")
        if (typeof window !== "undefined") {
          window.location.replace(safeNext === "/" ? "/account" : safeNext)
        }
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
      <h2 className="text-center text-2xl font-bold">تعيين كلمة مرور جديدة</h2>
      <div className="grid gap-2">
        <label className="text-sm">كلمة المرور الجديدة</label>
        <input type="password" dir="ltr" required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-full border px-4 py-3" placeholder="••••••••" />
      </div>
      <div className="grid gap-2">
        <label className="text-sm">تأكيد كلمة المرور</label>
        <input type="password" dir="ltr" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="rounded-full border px-4 py-3" placeholder="••••••••" />
      </div>
      <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">تحديث كلمة المرور</button>
      {message && <div className="rounded-md border border-emerald-500 bg-emerald-50 p-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
    </form>
  )
}
