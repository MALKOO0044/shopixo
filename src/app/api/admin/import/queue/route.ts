import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, isDatabaseConfigured } from "@/lib/db/replit-pg";
import { calculateRetailSar, usdToSar } from "@/lib/pricing";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const batchId = searchParams.get("batch_id");
    const category = searchParams.get("category");
    const limit = Math.min(100, Number(searchParams.get("limit") || 50));
    const offset = Number(searchParams.get("offset") || 0);

    let sql = `SELECT * FROM product_queue WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== "all") {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (batchId) {
      sql += ` AND batch_id = $${paramIndex++}`;
      params.push(Number(batchId));
    }
    if (category && category !== "all") {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` ORDER BY quality_score DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const products = await query<any>(sql, params);

    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM product_queue WHERE status = $1`,
      [status === "all" ? "pending" : status]
    );

    const statsResult = await query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM product_queue GROUP BY status`
    );
    
    const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0, imported: 0 };
    statsResult.forEach((row) => {
      stats[row.status] = Number(row.count);
    });

    return NextResponse.json({
      ok: true,
      products: products || [],
      total: countResult?.count || 0,
      stats,
    });
  } catch (e: any) {
    console.error("[Queue GET] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { ids, action, data } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: "No product IDs provided" }, { status: 400 });
    }

    let updateFields: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let paramIndex = 1;

    switch (action) {
      case "approve":
        updateFields.push(`status = 'approved'`);
        updateFields.push(`reviewed_at = NOW()`);
        break;
      case "reject":
        updateFields.push(`status = 'rejected'`);
        updateFields.push(`reviewed_at = NOW()`);
        break;
      case "pending":
        updateFields.push(`status = 'pending'`);
        updateFields.push(`reviewed_at = NULL`);
        break;
      case "update":
        if (data) {
          if (data.name_en) {
            updateFields.push(`name_en = $${paramIndex++}`);
            params.push(data.name_en);
          }
          if (data.name_ar) {
            updateFields.push(`name_ar = $${paramIndex++}`);
            params.push(data.name_ar);
          }
          if (data.description_en) {
            updateFields.push(`description_en = $${paramIndex++}`);
            params.push(data.description_en);
          }
          if (data.description_ar) {
            updateFields.push(`description_ar = $${paramIndex++}`);
            params.push(data.description_ar);
          }
          if (data.category) {
            updateFields.push(`category = $${paramIndex++}`);
            params.push(data.category);
          }
          if (data.admin_notes !== undefined) {
            updateFields.push(`admin_notes = $${paramIndex++}`);
            params.push(data.admin_notes);
          }
          if (data.calculated_retail_sar) {
            updateFields.push(`calculated_retail_sar = $${paramIndex++}`);
            params.push(data.calculated_retail_sar);
          }
          if (data.margin_applied) {
            updateFields.push(`margin_applied = $${paramIndex++}`);
            params.push(data.margin_applied);
          }
        }
        break;
      default:
        return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${paramIndex + i}`).join(', ');
    params.push(...ids);

    const sql = `UPDATE product_queue SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`;
    await execute(sql, params);

    try {
      await execute(
        `INSERT INTO import_logs (action, status, details) VALUES ($1, $2, $3)`,
        [`queue_${action}`, "success", JSON.stringify({ ids, action, data })]
      );
    } catch (logErr) {
      console.error("[Queue PATCH] Log error:", logErr);
    }

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (e: any) {
    console.error("[Queue PATCH] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({ ok: false, error: "No IDs provided" }, { status: 400 });
    }

    const ids = idsParam.split(",").map(Number).filter(n => !isNaN(n));
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: "Invalid IDs" }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await execute(`DELETE FROM product_queue WHERE id IN (${placeholders})`, ids);

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    console.error("[Queue DELETE] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
