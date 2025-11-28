import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: rules, error } = await admin
      .from("pricing_rules")
      .select("*")
      .order("is_default", { ascending: false })
      .order("category", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rules: rules || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, margin_percent, min_profit_sar, vat_percent, payment_fee_percent, smart_rounding_enabled, rounding_targets } = body;

    if (!category?.trim()) {
      return NextResponse.json({ ok: false, error: "Category is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: existing } = await admin
      .from("pricing_rules")
      .select("id")
      .eq("category", category.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: false, error: "Category already exists" }, { status: 400 });
    }

    const { data: rule, error } = await admin
      .from("pricing_rules")
      .insert({
        category: category.trim(),
        margin_percent: margin_percent || 40,
        min_profit_sar: min_profit_sar || 35,
        vat_percent: vat_percent || 15,
        payment_fee_percent: payment_fee_percent || 2.9,
        smart_rounding_enabled: smart_rounding_enabled !== false,
        rounding_targets: rounding_targets || [49, 79, 99, 149, 199, 249, 299],
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rule });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, category, margin_percent, min_profit_sar, vat_percent, payment_fee_percent, smart_rounding_enabled, rounding_targets } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Rule ID is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    
    if (category !== undefined) updateData.category = category;
    if (margin_percent !== undefined) updateData.margin_percent = margin_percent;
    if (min_profit_sar !== undefined) updateData.min_profit_sar = min_profit_sar;
    if (vat_percent !== undefined) updateData.vat_percent = vat_percent;
    if (payment_fee_percent !== undefined) updateData.payment_fee_percent = payment_fee_percent;
    if (smart_rounding_enabled !== undefined) updateData.smart_rounding_enabled = smart_rounding_enabled;
    if (rounding_targets !== undefined) updateData.rounding_targets = rounding_targets;

    const { data: rule, error } = await admin
      .from("pricing_rules")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rule });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Rule ID is required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { data: rule } = await admin
      .from("pricing_rules")
      .select("is_default")
      .eq("id", Number(id))
      .single();

    if (rule?.is_default) {
      return NextResponse.json({ ok: false, error: "Cannot delete default rule" }, { status: 400 });
    }

    const { error } = await admin
      .from("pricing_rules")
      .delete()
      .eq("id", Number(id));

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
