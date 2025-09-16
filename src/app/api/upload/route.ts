import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getClientIp, uploadLimiter } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Upstash Redis rate limiting is used instead of in-memory

export async function POST(req: Request) {
  try {
    // Auth: require signed-in admin by email list
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = adminEmails.length === 0
      ? process.env.NODE_ENV !== "production"
      : !!user.email && adminEmails.includes(user.email.toLowerCase());
    if (!isAdmin) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    // Rate limit (Upstash Redis)
    try {
      const ip = getClientIp(req);
      const { success } = await uploadLimiter.limit(ip);
      if (!success) {
        return NextResponse.json({ ok: false, message: "Too Many Requests" }, { status: 429 });
      }
    } catch {}

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const dir = (form.get("dir") as string | null) || "";
    if (!file) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
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

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { ok: false, message: "Server misconfiguration: missing Supabase envs" },
        { status: 500 }
      );
    }

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
    const base = `uploads/${y}/${m}/${user.id}` + (safeDir ? `/${safeDir}` : "");
    const safeName = sanitizeFileName(file.name || "file");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
    const rnd = Math.random().toString(36).slice(2);
    const path = `${base}/${now.getTime()}-${rnd}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucketName)
      .upload(path, file, { contentType: contentType || undefined, upsert: true });
    if (upErr) {
      return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    }

    const pub = supabase.storage.from(bucketName).getPublicUrl(path);
    const publicUrl = (pub as any)?.data?.publicUrl || (pub as any)?.publicURL || (pub as any)?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ ok: false, message: "Could not resolve public URL" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: publicUrl, path }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "Upload failed" }, { status: 500 });
  }
}
