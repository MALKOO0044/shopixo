import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const dir = (form.get("dir") as string | null) || "";
    if (!file) {
      return NextResponse.json({ ok: false, message: "No file provided" }, { status: 400 });
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
    const base = `uploads/${y}/${m}` + (dir ? `/${dir}` : "");
    const safeName = sanitizeFileName(file.name || "file");
    const ext = safeName.includes(".") ? safeName.split(".").pop() : "bin";
    const rnd = Math.random().toString(36).slice(2);
    const path = `${base}/${now.getTime()}-${rnd}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(bucketName)
      .upload(path, file, { contentType: file.type || undefined, upsert: true });
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
