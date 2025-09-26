import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from 'crypto'

export function middleware(req: NextRequest) {
  // Generate a per-request nonce
  const nonce = crypto.randomBytes(16).toString('base64')

  // Pass nonce to downstream server components via request headers
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-csp-nonce', nonce)

  const res = NextResponse.next({ request: { headers: requestHeaders } })

  // Build CSP with nonce (remove 'unsafe-inline')
  const stripe = "https://*.stripe.com https://m.stripe.network"
  const plausible = "https://plausible.io https://events.plausible.io"
  const supabase = "https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in"
  const cloudinary = "https://api.cloudinary.com"
  const sentry = "https://*.sentry.io"

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${stripe} ${plausible}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self' ${supabase} ${stripe} ${cloudinary} ${plausible} ${sentry}`,
    "frame-src https://*.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://hooks.stripe.com",
    "frame-ancestors 'none'",
  ].join('; ')

  res.headers.set('Content-Security-Policy', csp.replace(/\s{2,}/g, ' ').trim())

  return res
}

export const config = {
  matcher: [
    // Apply to all paths except static assets and API routes that may need streaming
    '/((?!_next/static|_next/image|favicon.ico|.*\.(png|jpg|jpeg|svg|webp|gif)|api/stripe/webhook|api/cj/webhook).*)',
  ],
}
