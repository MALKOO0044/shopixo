import { NextResponse, type NextRequest } from 'next/server'
import { contactLimiter, getClientIp } from '@/lib/ratelimit'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isEmail(s: unknown): s is string {
  if (typeof s !== 'string') return false
  const v = s.trim()
  if (!v) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch: string) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  } as Record<string, string>)[ch]!)
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req as unknown as Request)
    const rl = await contactLimiter.limit(`contact:${ip}`)
    if (!rl.success) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  } catch {}

  const body = await req.json().catch(() => null) as any
  const name = (body?.name || '').toString().trim()
  const email = (body?.email || '').toString().trim()
  const message = (body?.message || '').toString().trim()

  if (!name || !isEmail(email) || !message || message.length < 10) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  // Persist to Supabase if service role is configured
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && service) {
      const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })
      await admin.from('contact_messages').insert({ name, email, message }).single()
    }
  } catch (e) {
    // swallow
  }

  // Notify admins via Resend if configured
  try {
    const admins = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)
    const apiKey = process.env.RESEND_API_KEY
    if (admins.length && apiKey) {
      const domain = (process.env.NEXT_PUBLIC_SITE_URL || 'shopixo.vercel.app').replace(/^https?:\/\//,'')
      const html = `
        <div style="font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6">
          <h2 style="margin:0 0 12px">رسالة تواصل جديدة</h2>
          <p style="margin:0 0 6px"><strong>الاسم:</strong> ${name}</p>
          <p style="margin:0 0 6px"><strong>البريد:</strong> ${email}</p>
          <p style="margin:12px 0 6px"><strong>الرسالة:</strong></p>
          <div style="white-space:pre-wrap">${escapeHtml(message || '')}</div>
        </div>`
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Shopixo'} <no-reply@${domain}>`,
          to: admins,
          subject: `رسالة من ${name}`,
          html,
        })
      })
    }
  } catch {}

  return NextResponse.json({ ok: true })
}
