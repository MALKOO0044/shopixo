"use client"

import { useState, useTransition } from "react"

export default function Newsletter() {
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState<string>("")
  const [err, setErr] = useState<string>("")
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setMsg(""); setErr("")
    if (!email) { setErr("الرجاء إدخال البريد الإلكتروني"); return }
    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) throw new Error("فشل الاشتراك")
        setMsg("تم الاشتراك بنجاح. شكرًا لك!")
        setEmail("")
      } catch (e: any) {
        setErr(e?.message || "تعذر الاشتراك حاليًا")
      }
    })
  }

  return (
    <section className="py-10" aria-label="النشرة البريدية">
      <div className="container rounded-[var(--radius-lg)] border bg-card p-6 shadow-soft">
        <h2 className="mb-2 text-2xl font-bold">اشترك في النشرة البريدية</h2>
        <p className="mb-4 text-sm text-muted-foreground">كن أول من يعرف عن العروض والمنتجات الجديدة. إدخال البريد فقط.</p>
        <form onSubmit={onSubmit} className="flex flex-col items-stretch gap-3 sm:flex-row" dir="rtl">
          <input
            type="email"
            required
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 flex-1 rounded-[var(--radius-sm)] border px-4"
            dir="ltr"
          />
          <button disabled={pending} className="h-12 rounded-[var(--radius-btn)] bg-[hsl(var(--primary))] px-6 text-white hover:brightness-95">
            اشتراك
          </button>
        </form>
        {(msg || err) && (
          <div className="mt-3 text-sm">
            {msg && <div className="text-green-700">{msg}</div>}
            {err && <div className="text-red-600">{err}</div>}
          </div>
        )}
      </div>
    </section>
  )
}
