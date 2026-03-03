import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart-actions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getCart();
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return NextResponse.json({ count });
  } catch (e: any) {
    console.error("[Cart Count API] Error:", e);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
