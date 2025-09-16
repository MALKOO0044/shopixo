import crypto from "crypto";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getClientIp, signLimiter } from "@/lib/ratelimit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

// Upstash Redis rate limiting is used instead of in-memory

export async function GET(req: Request) {
  // Require authenticated admin
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ ok: false, message: 'Unauthorized' }), { status: 401 });
  }
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = admins.length === 0
    ? (process.env.NODE_ENV !== 'production')
    : (!!user.email && admins.includes((user.email || '').toLowerCase()));
  if (!isAdmin) {
    return new Response(JSON.stringify({ ok: false, message: 'Forbidden' }), { status: 403 });
  }

  // Rate limit (Upstash Redis)
  try {
    const addr = getClientIp(req);
    const { success } = await signLimiter.limit(addr);
    if (!success) {
      return new Response(JSON.stringify({ ok: false, message: 'rate_limited' }), { status: 429 });
    }
  } catch {}
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !uploadPreset) {
    return new Response(
      JSON.stringify({ ok: false, message: "Cloudinary environment variables are not fully configured." }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Build the signature string in alphabetical order of params
  // We sign at least timestamp and upload_preset; you can add folder, tags, etc. if needed.
  const signatureBase = `timestamp=${timestamp}&upload_preset=${uploadPreset}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureBase).digest('hex');

  return new Response(JSON.stringify({ ok: true, timestamp, signature, apiKey, cloudName, uploadPreset }), { status: 200, headers: { 'content-type': 'application/json' } });
}
