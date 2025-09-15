"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useMemo, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { Facebook, Smartphone, Eye, EyeOff } from "lucide-react"

// Unified Auth Flow
// Steps:
// 1) email -> Continue
// 2) password (attempt sign-in)
//    - if success -> redirect
//    - if failure -> treat as new account -> send email OTP (shouldCreateUser: true) -> step 3
// 3) verify_code (enter 6-digit)
//    - if success -> update password -> step 4
// 4) onboarding (full name + birthday) -> update user metadata -> redirect

type Step = "email" | "password" | "verify_code" | "onboarding" | "phone"

export default function AuthForm() {
  const supabase = createClientComponentClient()
  const searchParams = useSearchParams()
  const nextParam = (searchParams?.get("redirect") || searchParams?.get("next") || "/").toString()
  const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/"
  const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : (typeof window !== "undefined" ? window.location.origin : "")
  const redirectTo = base ? `${base.replace(/\/$/, "")}/auth/callback` : "/auth/callback"

  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [code, setCode] = useState("")
  const [fullName, setFullName] = useState("")
  const [birthday, setBirthday] = useState("") // MM/DD/YYYY
  const [info, setInfo] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [emailExists, setEmailExists] = useState<boolean | null>(null)

  const titleByStep = useMemo(() => {
    switch (step) {
      case "email":
        return "تسجيل الدخول أو إنشاء حساب"
      case "password":
        return emailExists === false ? "إنشاء كلمة المرور" : "أدخل كلمة المرور"
      case "verify_code":
        return "تحقق من بريدك"
      case "onboarding":
        return "أخبرنا عنك"
      case "phone":
        return "تسجيل عبر رقم الجوال"
      default:
        return ""
    }
  }, [step, emailExists])

  function resetMessages() {
    setError("")
    setInfo("")
  }

  // Handlers
  function handleContinueFromEmail(e: React.FormEvent) {
    e.preventDefault()
    resetMessages()
    if (!email) {
      setError("الرجاء إدخال البريد الإلكتروني")
      return
    }
    // Check if email exists via server to differentiate UX
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })
        if (res.ok) {
          const j = await res.json()
          if (typeof j.exists === "boolean") {
            setEmailExists(j.exists)
          } else {
            // unknown -> fallback behavior
            setEmailExists(null)
          }
        } else {
          setEmailExists(null)
        }
      } catch {
        setEmailExists(null)
      }
      setStep("password")
    })
  }

  function heading(h: string) {
    return (
      <h2 className="mb-4 text-center text-2xl font-bold">{h}</h2>
    )
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    resetMessages()
    if (!email || !password) {
      setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور")
      return
    }

    startTransition(async () => {
      if (emailExists === true) {
        // Existing account -> sign in only
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (!signInErr && data?.user) {
          if (typeof window !== "undefined") window.location.replace(safeNext)
          return
        }
        setError("كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى أو استخدام خيار استعادة كلمة المرور.")
        return
      }

      if (emailExists === false) {
        // New account -> sign up + send OTP
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        })
        if (!signUpErr) {
          await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }).catch(() => {})
          setInfo(`تم إرسال رمز التحقق إلى ${email}.`)
          setStep("verify_code")
          return
        }
        setError(signUpErr?.message || "تعذر إنشاء الحساب")
        return
      }

      // Fallback behavior when existence is unknown: try sign-in then sign-up
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr && data?.user) {
        if (typeof window !== "undefined") window.location.replace(safeNext)
        return
      }
      const { error: signUpErr } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      if (!signUpErr) {
        await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } }).catch(() => {})
        setInfo(`تم إرسال رمز التحقق إلى ${email}.`)
        setStep("verify_code")
        return
      }
      setError(signUpErr?.message || "حصل خطأ غير متوقع")
    })
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    resetMessages()
    if (!code || code.length < 6) {
      setError("الرجاء إدخال الرمز المكوّن من 6 أرقام")
      return
    }

    startTransition(async () => {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      })
      if (verifyErr) {
        setError(verifyErr.message)
        return
      }

      // Password already set during signUp; proceed to onboarding
      setStep("onboarding")
    })
  }

  async function handleResend() {
    resetMessages()
    startTransition(async () => {
      // Re-send a fresh 6-digit OTP email
      const { error: otpErr } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
      if (otpErr) setError(otpErr.message)
      else setInfo("تمت إعادة إرسال رمز التحقق إلى بريدك الإلكتروني.")
    })
  }

  function parseBirthday(input: string): string | null {
    // Expect MM/DD/YYYY; return YYYY-MM-DD or null if invalid
    const m = input.match(/^\s*(\d{2})\/(\d{2})\/(\d{4})\s*$/)
    if (!m) return null
    const mm = Number(m[1])
    const dd = Number(m[2])
    const yyyy = Number(m[3])
    const d = new Date(yyyy, mm - 1, dd)
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null
    return `${yyyy.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd.toString().padStart(2, "0")}`
  }

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault()
    resetMessages()
    if (!fullName.trim()) {
      setError("الرجاء إدخال الاسم الكامل")
      return
    }
    const iso = parseBirthday(birthday)
    if (!iso) {
      setError("الرجاء إدخال تاريخ صحيح بصيغة MM/DD/YYYY")
      return
    }

    startTransition(async () => {
      const { error: updErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim(), birthday: iso },
      })
      if (updErr) {
        setError(updErr.message)
        return
      }
      if (typeof window !== "undefined") window.location.replace(safeNext === "/" ? "/account" : safeNext)
    })
  }

  async function handleOAuth(provider: "google" | "facebook") {
    resetMessages()
    const withNext = safeNext && safeNext !== "/" ? `${redirectTo}?next=${encodeURIComponent(safeNext)}` : redirectTo
    const options: any = { redirectTo: withNext }
    if (provider === "facebook") {
      options.scopes = "email public_profile"
      options.queryParams = { auth_type: "rerequest" }
    }
    const { error } = await supabase.auth.signInWithOAuth({ provider, options })
    if (error) setError(error.message)
  }

  // Phone (optional minimal panel)
  const [phone, setPhone] = useState("")
  const [phoneCode, setPhoneCode] = useState("")
  const [phoneSent, setPhoneSent] = useState(false)

  async function handlePhoneSend(e: React.FormEvent) {
    e.preventDefault(); resetMessages()
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({ phone })
      if (error) setError(error.message); else setPhoneSent(true)
    })
  }
  async function handlePhoneVerify(e: React.FormEvent) {
    e.preventDefault(); resetMessages()
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({ phone, token: phoneCode, type: "sms" })
      if (error) setError(error.message); else if (typeof window !== "undefined") window.location.replace(safeNext)
    })
  }

  // UI helpers
  function PillButton({ children, variant = "outline", onClick, disabled }: { children: React.ReactNode; variant?: "outline" | "solid"; onClick?: () => void; disabled?: boolean }) {
    const common = "w-full h-12 rounded-full px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2"
    const cls = variant === "solid"
      ? `${common} bg-[#1a73e8] text-white hover:opacity-95 focus:ring-[#1a73e8]`
      : `${common} border hover:bg-accent`
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cls}>
        <div className="flex items-center justify-between flex-row-reverse">
          {children}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-5" dir="rtl">
      {heading(titleByStep)}

      {/* Step: email */}
      {step === "email" && (
        <form onSubmit={handleContinueFromEmail} className="space-y-3">
          <div className="grid gap-2">
            <label className="text-sm">البريد الإلكتروني</label>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border px-4 py-3"
              placeholder="example@email.com"
            />
          </div>
          <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">
            متابعة
          </button>
        </form>
      )}

      {/* Step: password */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 flex items-center justify-between">
            <span className="truncate">{email}</span>
            <button type="button" className="underline" onClick={() => setStep("email")}>تعديل</button>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">{emailExists === false ? "إنشاء كلمة المرور" : "كلمة المرور"}</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border px-4 py-3 pr-12"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 left-3 flex items-center text-gray-500">
                {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div />
            {emailExists !== false && (
              <a
                href={`/forgot-password${safeNext && safeNext !== "/" ? `?next=${encodeURIComponent(safeNext)}` : ""}${email ? `${safeNext && safeNext !== "/" ? "&" : "?"}email=${encodeURIComponent(email)}` : ""}`}
                className="text-blue-600 hover:underline"
              >
                نسيت كلمة المرور؟
              </a>
            )}
          </div>
          <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">
            متابعة
          </button>
          {emailExists === false && (
            <p className="text-xs text-gray-500 text-center">سيتم إنشاء حساب جديد لهذا البريد الإلكتروني.</p>
          )}
        </form>
      )}

      {/* Step: verify code */}
      {step === "verify_code" && (
        <form onSubmit={handleVerifyCode} className="space-y-3">
          <p className="text-center text-sm text-gray-600">أدخل رمز التحقق الذي أرسلناه إلى {email}</p>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-full border px-4 py-3 text-center tracking-widest"
            placeholder="Code"
            dir="ltr"
          />
          <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">
            متابعة
          </button>
          <div className="text-center">
            <button type="button" onClick={handleResend} className="text-sm text-blue-600 hover:underline">إعادة إرسال البريد</button>
          </div>
        </form>
      )}

      {/* Step: onboarding */}
      {step === "onboarding" && (
        <form onSubmit={handleOnboarding} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm">الاسم الكامل</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-full border px-4 py-3"
              placeholder="الاسم الكامل"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">تاريخ الميلاد</label>
            <input
              type="text"
              required
              dir="ltr"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="rounded-full border px-4 py-3"
              placeholder="MM/DD/YYYY"
            />
          </div>
          <p className="text-xs text-gray-600 text-center">
            بالنقر على "متابعة"، فإنك توافق على شروط الخدمة وقد قرأت سياسة الخصوصية.
          </p>
          <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">
            متابعة
          </button>
        </form>
      )}

      {/* Divider */}
      {step === "email" && (
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>أو</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      )}

      {/* Social + phone options */}
      {step === "email" && (
        <div className="space-y-3">
          <PillButton variant="solid" onClick={() => handleOAuth("google")} disabled={pending}>
            <span className="flex-1 text-center">المتابعة من خلال Google</span>
            <GoogleIcon />
          </PillButton>
          <PillButton onClick={() => handleOAuth("facebook")} disabled={pending}>
            <span className="flex-1 text-center">المتابعة من خلال Facebook</span>
            <Facebook className="h-5 w-5 text-[#1877f2]" />
          </PillButton>
          <PillButton onClick={() => setStep("phone")} disabled={pending}>
            <span className="flex-1 text-center">المتابعة من خلال رقم الجوال</span>
            <Smartphone className="h-5 w-5" />
          </PillButton>
        </div>
      )}

      {/* Phone panel (optional) */}
      {step === "phone" && (
        <div className="space-y-3">
          <form onSubmit={handlePhoneSend} className="grid gap-2">
            <label className="text-sm">رقم الجوال (مثال: +9665xxxxxxxx)</label>
            <input type="tel" dir="ltr" required value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-full border px-4 py-3" />
            <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">إرسال الرمز</button>
          </form>
          {phoneSent && (
            <form onSubmit={handlePhoneVerify} className="grid gap-2">
              <label className="text-sm">أدخل رمز التحقق</label>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={6} dir="ltr" required value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="rounded-full border px-4 py-3" />
              <button disabled={pending} className="w-full h-12 rounded-full bg-black text-white text-sm font-semibold hover:opacity-95">تأكيد</button>
            </form>
          )}
          <div className="text-center">
            <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setStep("email")}>رجوع</button>
          </div>
        </div>
      )}

      {/* Messages */}
      {(error || info) && (
        <div className="space-y-2">
          {error && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
          {info && <div className="rounded-md border border-emerald-500 bg-emerald-50 p-2 text-sm text-emerald-700">{info}</div>}
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden className="ml-1">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 33.7 29.4 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.2l5.7-5.7C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.2 18.9 13 24 13c3.3 0 6.3 1.2 8.6 3.2l5.7-5.7C34.6 5.1 29.6 3 24 3 15.3 3 7.8 8.1 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 45c5.3 0 10.2-2 13.8-5.2l-6.4-5.3C29.2 35.7 26.8 36.5 24 36.5 18.7 36.5 14.1 33.1 12.4 28l-6.4 5C8.4 39.9 15.6 45 24 45c9.9 0 18.4-6.9 21-16.1.3-1.2.4-2.3.4-3.5 0-1-.1-1.9-.3-2.9z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-5.3 0-9.9-3.4-11.6-8.5l-6.4 5C8.4 39.9 15.6 45 24 45c9.9 0 18.4-6.9 21-16.1.3-1.2.4-2.3.4-3.5 0-1-.1-1.9-.3-2.9z"/>
    </svg>
  )
}
