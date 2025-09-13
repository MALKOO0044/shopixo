'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState, useTransition } from 'react'
import { Mail, Smartphone, Facebook, ChevronDown, ChevronUp } from 'lucide-react'

export default function AuthForm({ next = '/' }: { next?: string }) {
  const supabase = createClientComponentClient()
  const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const redirectTo = base ? `${base.replace(/\/$/, '')}/auth/callback` : '/auth/callback'
  const redirectWithNext = next ? `${redirectTo}?next=${encodeURIComponent(next)}` : redirectTo

  const [error, setError] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [pending, startTransition] = useTransition()

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError(''); setInfo('')
    // Ensure Facebook returns an email by requesting the standard scopes
    const options: { redirectTo: string; scopes?: string } = { redirectTo: redirectWithNext }
    if (provider === 'facebook') options.scopes = 'email public_profile'
    const { error } = await supabase.auth.signInWithOAuth({ provider, options })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('unsupported provider') || msg.includes('not enabled')) {
        setError(`مزود ${provider === 'google' ? 'Google' : 'Facebook'} غير مُفعّل في إعدادات Supabase. يرجى التأكد من تفعيله وإضافة بيانات OAuth وتعيين عنوان العودة الصحيح.`)
      } else if (msg.includes('redirect') || msg.includes('uri')) {
        setError('رابط العودة غير مسموح به. أضف https://shopixo.net/auth/callback إلى قائمة Redirect URLs في Supabase.')
      } else {
        setError(error.message)
      }
    }
  }

  function resendConfirm() {
    if (!email) return;
    setError(''); setInfo('')
    startTransition(async () => {
      // Resend email confirmation for signup
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) setError(error.message)
      else setInfo('تم إرسال رسالة تأكيد جديدة إلى بريدك الإلكتروني.')
    })
  }

  // Email/password (موحّد: نحاول تسجيل الدخول أولًا، وإن فشل نحاول إنشاء حساب)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    startTransition(async () => {
      // المحاولة 1: تسجيل الدخول
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr) {
        if (typeof window !== 'undefined') window.location.replace(next)
        return
      }

      // المحاولة 2: إنشاء حساب إن لم يكن موجودًا
      const { error: signUpErr } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectWithNext } })
      if (!signUpErr) {
        setInfo('تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. الرجاء فتح الرابط لإكمال التسجيل.')
        return
      }

      // في حال كان المستخدم موجودًا بالفعل وكلمة المرور غير صحيحة
      const msg = (signUpErr.message || '').toLowerCase()
      if (msg.includes('already registered') || msg.includes('user already exists')) {
        setError('الحساب موجود بالفعل. الرجاء إدخال كلمة المرور الصحيحة ثم المحاولة مجددًا.')
      } else {
        setError(signUpErr.message)
      }
    })
  }

  // Phone OTP
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  function requestOtp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setInfo('')
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({ phone })
      if (error) setError(error.message)
      else { setOtpSent(true); setInfo('تم إرسال رمز التحقق عبر رسالة نصية.') }
    })
  }

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setInfo('')
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' })
      if (error) setError(error.message)
      else if (typeof window !== 'undefined') window.location.replace(next)
    })
  }

  const [emailOpen, setEmailOpen] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)

  return (
    <div className="space-y-3" dir="rtl">
      {/* Google */}
      <button
        onClick={() => handleOAuth('google')}
        className="relative w-full rounded-full bg-[#1a73e8] px-4 py-3 pr-10 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 flex items-center justify-center"
        disabled={pending}
      >
        <span>المتابعة من خلال Google</span>
        <span className="absolute right-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white">
          {/* Inline Google G */}
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.915 31.659 29.406 35 24 35c-7.18 0-13-5.82-13-13s5.82-13 13-13c3.163 0 6.056 1.157 8.293 3.06l5.657-5.657C34.943 3.053 29.747 1 24 1 11.85 1 2 10.85 2 23s9.85 22 22 22 22-9.85 22-22c0-1.486-.153-2.937-.389-4.417z"/>
            <path fill="#FF3D00" d="M6.306 14.691l6.571 4.818C14.451 16.164 18.81 13 24 13c3.163 0 6.056 1.157 8.293 3.06l5.657-5.657C34.943 7.053 29.747 5 24 5c-7.438 0-13.74 4.064-17.694 9.691z"/>
            <path fill="#4CAF50" d="M24 45c5.342 0 10.207-2.047 13.86-5.385l-6.4-5.402C29.334 35.662 26.86 36.6 24 36.6c-5.369 0-9.9-3.618-11.516-8.518l-6.478 4.988C9.021 40.63 15.946 45 24 45z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.076 3.043-3.26 5.612-6.443 7.213l6.4 5.402C38.221 37.98 42 31.5 42 23c0-1.486-.153-2.937-.389-4.417z"/>
          </svg>
        </span>
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleOAuth('facebook')}
        className="relative w-full rounded-full border px-4 py-3 pr-10 text-sm font-semibold hover:bg-accent disabled:opacity-60 flex items-center justify-center"
        disabled={pending}
      >
        <span>المتابعة من خلال Facebook</span>
        <Facebook className="absolute right-3 h-5 w-5 text-[#1877f2]" />
      </button>

      {/* Email */}
      <button
        type="button"
        onClick={() => setEmailOpen((v) => !v)}
        className="w-full rounded-full border px-4 py-3 text-sm font-semibold hover:bg-accent flex items-center justify-between"
      >
        <span className="flex items-center gap-2"><Mail className="h-5 w-5" /> المتابعة من خلال البريد الإلكتروني</span>
        {emailOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {emailOpen && (
        <form onSubmit={submitEmail} className="space-y-2 rounded-xl border p-3">
          <div className="grid gap-2">
            <label className="text-sm">البريد الإلكتروني</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border px-3 py-2" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">كلمة المرور</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-md border px-3 py-2" />
          </div>
          <button disabled={pending} className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">متابعة</button>
          <p className="text-xs text-muted-foreground">سنعمل على تسجيل الدخول إن كان لديك حساب، أو إنشاء حساب جديد وإرسال رسالة تأكيد إلى بريدك.</p>
        </form>
      )}


      {/* Phone */}
      <button
        type="button"
        onClick={() => setPhoneOpen((v) => !v)}
        className="w-full rounded-full border px-4 py-3 text-sm font-semibold hover:bg-accent flex items-center justify-between"
      >
        <span className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> المتابعة من خلال رقم الجوال</span>
        {phoneOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {phoneOpen && (
        <div className="space-y-2 rounded-xl border p-3">
          <form onSubmit={requestOtp} className="grid gap-2">
            <label className="text-sm">رقم الجوال (مثال: +9665xxxxxxxx)</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-md border px-3 py-2" />
            <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">إرسال الرمز</button>
          </form>
          {otpSent && (
            <form onSubmit={verifyOtp} className="grid gap-2">
              <label className="text-sm">أدخل رمز التحقق</label>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} className="rounded-md border px-3 py-2" />
              <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">تأكيد</button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">تأكد من تفعيل مزود الرسائل القصيرة في إعدادات Supabase لاستخدام تسجيل الجوال.</p>
        </div>
      )}

      {error && <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
      {info && (
        <div className="rounded-md border border-emerald-500 bg-emerald-50 p-2 text-sm text-emerald-700 flex items-center justify-between gap-2">
          <span>{info}</span>
          {email && (
            <button type="button" onClick={resendConfirm} className="rounded border px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100">
              إعادة الإرسال
            </button>
          )}
        </div>
      )}
    </div>
  )
}

