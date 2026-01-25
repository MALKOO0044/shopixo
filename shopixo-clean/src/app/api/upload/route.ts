import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, uploadLimiter } from "@/lib/ratelimit";
import { ensureAdmin } from "@/lib/auth/admin-guard";
import { loggerForRequest } from "@/lib/log";
import { ensureEnv, getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Upstash Redis rate limiting is used instead of in-memory

export async function POST(req: Request) {
  try {
    const log = loggerForRequest(req);
    // Auth: require admin via centralized guard
    const guard = await ensureAdmin();
    if (!guard.ok) {
      const r = NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    // Rate limit (Upstash Redis)
    try {
      const ip = getClientIp(req);
      const { success } = await uploadLimiter.limit(ip);
      if (!success) {
        const r = NextResponse.json({ ok: false, message: "Too Many Requests" }, { status: 429 });
        r.headers.set('x-request-id', log.requestId);
        return r;
      }
    } catch {}

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const dir = (form.get("dir") as string | null) || "";
    if (!file) {
      const r = NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    // Validate content type & size
    const allowed = [
      // images
      "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml",
      // videos
      "video/mp4", "video/webm", "video/ogg", "application/vnd.apple.mpegURL"
    ];
    const maxBytes = 15 * 1024 * 1024; // 15MB
    const contentType = (file.type || "").toLowerCase();
    if (!allowed.includes(contentType)) {
      return NextResponse.json({ ok: false, message: "Unsupported file type" }, { status: 415 });
    }
    if ((file as any).size && (file as any).size > maxBytes) {
      return NextResponse.json({ ok: false, message: "File too large" }, { status: 413 });
    }

    const need = ensureEnv(['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']);
    if (!need.ok) {
      const r = NextResponse.json(
        { ok: false, message: "Server misconfiguration: missing Supabase envs" },
        { status: 500 }
      );
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    const url = getEnv('NEXT_PUBLIC_SUPABASE_URL') as string;
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') as string;

    const supabase = createClient(url, key);

    // Ensure bucket exists (public)
    const bucketName = "products";
    try {
      const { data: bucketInfo, error: bucketInfoErr } = await supabase.storage.getBucket(bucketName);
      if (!bucketInfo || bucketInfoErr) {
        await supabase.storage.createBucket(bucketName, { public: true });
      }
    } catch {}

    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const safeDir = sanitizeFileName(dir).slice(0, 64);
    const base = `uploads/${y}/${m}/${guard.user.id}` + (safeDir ? `/${safeDir}` : "");
    const safeName = sanitizeFileName(file.name || "file");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
    const rnd = Math.random().toString(36).slice(2);
    const path = `${base}/${now.getTime()}-${rnd}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucketName)
      .upload(path, file, { contentType: contentType || undefined, upsert: true });
    if (upErr) {
      const r = NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    const pub = supabase.storage.from(bucketName).getPublicUrl(path);
    const publicUrl = (pub as any)?.data?.publicUrl || (pub as any)?.publicURL || (pub as any)?.publicUrl;

    if (!publicUrl) {
      const r = NextResponse.json({ ok: false, message: "Could not resolve public URL" }, { status: 500 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }

    const r = NextResponse.json({ ok: true, url: publicUrl, path }, { status: 200 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, message: e?.message || "Upload failed" }, { status: 500 });
    try { r.headers.set('x-request-id', loggerForRequest(req).requestId); } catch {}
    return r;
  }
}
