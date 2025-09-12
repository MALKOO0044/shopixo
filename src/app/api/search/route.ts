import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientIp, searchLimiter } from "@/lib/ratelimit";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  // Rate limit (Upstash Redis)
  try {
    const ip = getClientIp(req);
    const { success } = await searchLimiter.limit(ip);
    if (!success) {
      return NextResponse.json({ items: [], error: 'rate_limited' }, { status: 429 });
    }
  } catch (e) {
    // if rate limit infra fails, do not block search
  }

  // Minimal input validation
  if (!q) {
    return NextResponse.json({ items: [] });
  }
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    // Gracefully degrade if env missing during build or misconfiguration
    return NextResponse.json({ items: [], error: "Supabase env not configured" }, { status: 200 });
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
    if (fbErr) return NextResponse.json({ items: [], error: fbErr.message }, { status: 500 });
    return NextResponse.json({ items: fbData ?? [] });
  }
  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
