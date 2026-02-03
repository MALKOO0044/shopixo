import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function extractFirstImage(images: any): string {
  if (!images) return "";
  
  if (Array.isArray(images) && images.length > 0) {
    return images[0];
  }
  
  if (typeof images === 'string') {
    const cleaned = images.replace(/^\{|\}$/g, '');
    const urls = cleaned.split(',').filter(u => u.startsWith('http'));
    if (urls.length > 0) {
      return urls[0].trim();
    }
  }
  
  return "";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "4"), 10);

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    let { data: products, error } = await supabase
      .from("products")
      .select("id, title, price, images, slug, displayed_rating, stock")
      .gt("stock", 0)
      .order("displayed_rating", { ascending: false, nullsFirst: false })
      .order("stock", { ascending: false })
      .limit(limit * 2);

    if (error) {
      console.error("Error fetching curated products:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    
    if (!products || products.length === 0) {
      const fallbackResult = await supabase
        .from("products")
        .select("id, title, price, images, slug, displayed_rating, stock")
        .order("displayed_rating", { ascending: false, nullsFirst: false })
        .limit(limit * 2);
      
      if (!fallbackResult.error) {
        products = fallbackResult.data;
      }
    }
    
    const curated = (products || [])
      .map((p: any) => {
        const firstImage = extractFirstImage(p.images);
        return {
          id: p.id,
          name: p.title,
          price: p.price || 0,
          image: firstImage,
          slug: p.slug || String(p.id),
          inStock: (p.stock || 0) > 0,
        };
      })
      .filter((p: any) => p.image)
      .slice(0, limit);

    return NextResponse.json({ ok: true, products: curated });
  } catch (e: any) {
    console.error("Curated products error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
