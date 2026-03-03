import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const linkType = (requestUrl.searchParams.get('type') || '').toLowerCase()
  const nextParam = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirect') || '/'
  const safeNext = typeof nextParam === 'string' && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const shouldNotify = linkType === 'signup' || linkType === 'invite'
        // Do not notify on recovery or email-change flows
        if (!shouldNotify) {
          // Skip notification, still proceed to redirect later
        } else {
        const admins = (process.env.ADMIN_EMAILS || '')
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean)
        const apiKey = process.env.RESEND_API_KEY
        if (admins.length && apiKey) {
          // Send a brief admin notification (no passwords are ever accessible)
          const html = `
            <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height:1.6">
              <h2 style="margin:0 0 12px">New User Signed Up</h2>
              <p style="margin:0 0 8px"><strong>Email:</strong> ${user.email || ''}</p>
              <p style="margin:0 0 8px"><strong>Provider:</strong> ${(user.app_metadata as any)?.provider || 'email'}</p>
              <p style="color:#6b7280; font-size:12px">Sent automatically by ${process.env.NEXT_PUBLIC_STORE_NAME || 'Shopixo'}</p>
            </div>
          `
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${process.env.NEXT_PUBLIC_STORE_NAME || 'Shopixo'} <no-reply@${(process.env.NEXT_PUBLIC_SITE_URL || 'shopixo.vercel.app').replace(/^https?:\/\//,'')}>`,
              to: admins,
              subject: `New signup — ${(user.email || '').toString()}`,
              html,
            }),
          }).catch(() => {})
        }
        }
      }
    } catch {}
  }

  // Prefer deep redirect if present
  const target = safeNext === '/' ? requestUrl.origin : `${requestUrl.origin}${safeNext}`
  return NextResponse.redirect(target)
}
