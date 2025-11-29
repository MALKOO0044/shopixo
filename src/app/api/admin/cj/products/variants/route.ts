import { NextRequest, NextResponse } from "next/server";
import { queryVariantInventory } from "@/lib/cj/v2";
import { ensureAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get("pid");
    const warehouse = searchParams.get("warehouse") || undefined;
    
    if (!pid) {
      return NextResponse.json({ ok: false, error: "Missing pid parameter" }, { status: 400 });
    }
    
    const variants = await queryVariantInventory(pid, warehouse);
    
    return NextResponse.json({
      ok: true,
      pid,
      variants,
      total: variants.length,
    });
  } catch (e: any) {
    console.error("Variant inventory fetch error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch variants" }, { status: 500 });
  }
}
