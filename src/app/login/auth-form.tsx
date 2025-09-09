'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState, useTransition } from 'react'
import { Mail, Smartphone, Facebook, ChevronDown, ChevronUp } from 'lucide-react'

export default function AuthForm() {
  const supabase = createClientComponentClient()
  const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
    ? process.env.NEXT_PUBLIC_SITE_URL
    : (typeof window !== 'undefined' ? window.location.origin : '')
  const redirectTo = base ? `${base.replace(/\/$/, '')}/auth/callback` : '/auth/callback'

  const [error, setError] = useState<string>('')
  const [info, setInfo] = useState<string>('')
  const [pending, startTransition] = useTransition()

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError(''); setInfo('')
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('unsupported provider') || msg.includes('not enabled')) {
        setError(`مزود ${provider === 'google' ? 'Google' : 'Facebook'} غير مُفعّل في إعدادات Supabase. يرجى التأكد من تفعيله وإضافة بيانات OAuth وتعيين عنوان العودة الصحيح.`)
      } else if (msg.includes('redirect') || msg.includes('uri')) {
        setError('رابط العودة غير مسموح به. أضف https://shopixo.vercel.app/auth/callback إلى قائمة Redirect URLs في Supabase.')
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

  function requestEmailOtp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setInfo('')
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({ email: emailForOtp, options: { emailRedirectTo: redirectTo } })
      if (error) setError(error.message)
      else { setEmailOtpSent(true); setInfo('تم إرسال رمز التحقق إلى بريدك الإلكتروني.') }
    })
  }

  function verifyEmailOtp(e: React.FormEvent) {
    e.preventDefault(); setError(''); setInfo('')
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: emailForOtp, token: emailOtp, type: 'email' })
      if (error) setError(error.message)
      else if (typeof window !== 'undefined') window.location.replace('/')
    })
  }

  // Email/password
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailMode, setEmailMode] = useState<'signin'|'signup'>('signup')

  function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo('')
    startTransition(async () => {
      if (emailMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
        if (error) setError(error.message)
        else setInfo('تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. الرجاء فتح الرابط لإكمال التسجيل.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else if (typeof window !== 'undefined') window.location.replace('/')
      }
    })
  }

  // Phone OTP
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  // Email OTP
  const [emailForOtp, setEmailForOtp] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)

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
      else if (typeof window !== 'undefined') window.location.replace('/')
    })
  }

  const [emailOpen, setEmailOpen] = useState(false)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [emailOtpOpen, setEmailOtpOpen] = useState(false)

  return (
    <div className="space-y-3" dir="rtl">
      {/* Google */}
      <button
        onClick={() => handleOAuth('google')}
        className="w-full rounded-full bg-[#1a73e8] px-4 py-3 text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60"
        disabled={pending}
      >
        المتابعة من خلال Google
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleOAuth('facebook')}
        className="w-full rounded-full border px-4 py-3 text-sm font-semibold hover:bg-accent disabled:opacity-60 flex items-center justify-between"
        disabled={pending}
      >
        <span className="flex-1 text-center">المتابعة من خلال Facebook</span>
        <Facebook className="h-5 w-5 text-[#1877f2]" />
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
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="emailMode" checked={emailMode==='signup'} onChange={() => setEmailMode('signup')} /> إنشاء حساب
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="emailMode" checked={emailMode==='signin'} onChange={() => setEmailMode('signin')} /> تسجيل الدخول
            </label>
          </div>
          <button disabled={pending} className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">{emailMode==='signup' ? 'إنشاء حساب' : 'تسجيل الدخول'}</button>
          <p className="text-xs text-muted-foreground">قد تُرسل رسالة تأكيد إلى بريدك بعد إنشاء الحساب.</p>
        </form>
      )}

      {/* Email OTP */}
      <button
        type="button"
        onClick={() => setEmailOtpOpen((v) => !v)}
        className="w-full rounded-full border px-4 py-3 text-sm font-semibold hover:bg-accent flex items-center justify-between"
      >
        <span className="flex items-center gap-2"><Mail className="h-5 w-5" /> المتابعة من خلال رمز عبر البريد الإلكتروني</span>
        {emailOtpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {emailOtpOpen && (
        <div className="space-y-2 rounded-xl border p-3">
          <form onSubmit={requestEmailOtp} className="grid gap-2">
            <label className="text-sm">البريد الإلكتروني</label>
            <input type="email" required value={emailForOtp} onChange={(e) => setEmailForOtp(e.target.value)} className="rounded-md border px-3 py-2" />
            <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">إرسال الرمز</button>
          </form>
          {emailOtpSent && (
            <form onSubmit={verifyEmailOtp} className="grid gap-2">
              <label className="text-sm">أدخل رمز التحقق</label>
              <input inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} className="rounded-md border px-3 py-2" />
              <button disabled={pending} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">تأكيد</button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">لِعرض رمز التحقق داخل الرسالة، أضف المتغير <code>{'{{ .Token }}'}</code> في قالب رسالة Supabase.</p>
        </div>
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
