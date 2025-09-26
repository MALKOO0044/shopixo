import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { persistCjTracking } from '@/lib/ops/tracking';
import { cjWebhookLimiter, getClientIp } from '@/lib/ratelimit';

export const runtime = 'nodejs';

function verifySignature(raw: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  try {
    // Expect hex signature; normalize and compare in constant time
    const expectedHex = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const sigHex = signature.trim();
    const a = Buffer.from(sigHex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Rate limit by client IP to prevent abuse
  const ip = getClientIp(req as unknown as Request);
  const rl = await cjWebhookLimiter.limit(`cj:${ip}`);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const secret = process.env.CJ_WEBHOOK_SECRET;
  const raw = await req.text();
  const sig = req.headers.get('x-signature') || req.headers.get('x-cj-signature');
  const ok = verifySignature(raw, sig, secret);

  // Parse after verification to avoid tampering risks
  let payload: any = {};
  try { payload = JSON.parse(raw); } catch {}

  if (!ok) {
    console.warn('CJ webhook signature invalid or missing');
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    // In development, proceed to aid integration testing
  }

  // Handle events: shipped, tracking assigned, delivered, exception, etc.
  const event = payload?.event || payload?.type || 'unknown';
  console.log('CJ webhook:', event, payload?.data?.orderId || payload?.orderId);

  try {
    const saved = await persistCjTracking(payload);
    if (!saved.ok) {
      console.warn('persistCjTracking result:', saved.reason);
    }
  } catch (e: any) {
    console.warn('persistCjTracking error:', e?.message || e);
  }

  return NextResponse.json({ received: true, verified: ok });
}
