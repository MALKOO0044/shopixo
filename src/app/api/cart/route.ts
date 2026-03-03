import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getCart();
    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("[Cart API] Error:", e);
    return NextResponse.json({ items: [], error: e?.message }, { status: 500 });
  }
}
