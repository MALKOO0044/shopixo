import crypto from "crypto";
import { NextResponse } from "next/server";
import { getClientIp, signLimiter } from "@/lib/ratelimit";
import { ensureAdmin } from "@/lib/auth/admin-guard";
import { loggerForRequest } from "@/lib/log";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// Upstash Redis rate limiting is used instead of in-memory

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  log.info('cloudinary_sign_start');
  // Require authenticated admin
  const guard = await ensureAdmin();
  if (!guard.ok) {
    log.warn('cloudinary_sign_unauthorized', { reason: guard.reason });
    const r = NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  // Rate limit (Upstash Redis)
  try {
    const addr = getClientIp(req);
    const { success } = await signLimiter.limit(addr);
    if (!success) {
      log.warn('cloudinary_sign_rate_limited', { ip: addr });
      const r = NextResponse.json({ ok: false, message: 'rate_limited' }, { status: 429 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
  } catch {}
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    log.warn('cloudinary_env_missing');
    const r = NextResponse.json({ ok: false, message: "Cloudinary environment variables are not fully configured." }, { status: 400 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Build the signature string in alphabetical order of params
  // We sign at least timestamp and upload_preset; you can add folder, tags, etc. if needed.
  const signatureBase = `timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');

  const r = NextResponse.json({ ok: true, timestamp, signature, apiKey, cloudName, uploadPreset });
  r.headers.set('x-request-id', log.requestId);
  return r;
}
