import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) {
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
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, title, price, images")
    .ilike("title", `%${q}%`)
    .limit(8);
  if (error) return NextResponse.json({ items: [], error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
