import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, searchLimiter } from "@/lib/ratelimit";
import { loggerForRequest } from "@/lib/log";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: Request) {
  const log = loggerForRequest(req);
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  // Rate limit (Upstash Redis)
  try {
    const ip = getClientIp(req);
    const { success } = await searchLimiter.limit(ip);
    if (!success) {
      const r = NextResponse.json({ items: [], error: 'rate_limited' }, { status: 429 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
  } catch (e) {
    // if rate limit infra fails, do not block search
  }

  // Minimal input validation
  if (!q) {
    const r = NextResponse.json({ items: [] });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  if (q.length < 2) {
    const r = NextResponse.json({ items: [] });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Gracefully degrade if env missing during build or misconfiguration
    const r = NextResponse.json({ items: [], error: "Supabase env not configured" }, { status: 200 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const supabase = createClient(url, anon);
  // Basic search on title (ilike). In production consider full-text indexes.
  // Prefer active products; gracefully fallback if column is missing (pre-migration).
  let query = supabase
    .from("products")
    .select("id, slug, title, price, images")
    .ilike("title", `%${q}%`)
    .or("is_active.is.null,is_active.eq.true")
    .limit(8) as any;

  const { data, error } = await query;
  if (error && (String((error as any).message || "").includes("is_active") || (error as any).code === "42703")) {
    // Fallback: same query without the is_active filter
    const { data: fbData, error: fbErr } = await supabase
      .from("products")
      .select("id, slug, title, price, images")
      .ilike("title", `%${q}%`)
      .limit(8);
    if (fbErr) {
      const r = NextResponse.json({ items: [], error: fbErr.message }, { status: 500 });
      r.headers.set('x-request-id', log.requestId);
      return r;
    }
    const r = NextResponse.json({ items: fbData ?? [] });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  if (error) {
    const r = NextResponse.json({ items: [], error: error.message }, { status: 500 });
    r.headers.set('x-request-id', log.requestId);
    return r;
  }
  const r = NextResponse.json({ items: data ?? [] });
  r.headers.set('x-request-id', log.requestId);
  return r;
}
