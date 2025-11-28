import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cj/v2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const apiKey = process.env.CJ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "CJ API key not configured" });
    }

    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: "Failed to authenticate with CJ" });
    }

    const base = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";
    const res = await fetch(`${base}/product/getCategory`, {
      headers: {
        "CJ-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    
    if (data.code === 200 && data.data) {
      const categories = Array.isArray(data.data) ? data.data : [];
      return NextResponse.json({ 
        ok: true, 
        categories: categories.map((c: any) => ({
          categoryId: c.categoryId || c.id,
          categoryName: c.categoryName || c.name,
        }))
      });
    }

    return NextResponse.json({ 
      ok: true, 
      categories: [],
      message: "Connected but no categories found"
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Connection failed" });
  }
}
