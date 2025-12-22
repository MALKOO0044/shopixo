import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  cj_category_id: string | null;
  image_url: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
  children?: Category[];
}

function buildCategoryTree(categories: Category[]): Category[] {
  const categoryMap = new Map<number, Category>();
  const roots: Category[] = [];

  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach(cat => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parent_id === null) {
      roots.push(node);
    } else {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  });

  roots.sort((a, b) => a.display_order - b.display_order);
  roots.forEach(root => {
    if (root.children) {
      root.children.sort((a, b) => a.display_order - b.display_order);
      root.children.forEach(child => {
        if (child.children) {
          child.children.sort((a, b) => a.display_order - b.display_order);
        }
      });
    }
  });

  return roots;
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.error("[Categories API] DATABASE_URL not configured");
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const parentId = searchParams.get("parent_id");
    const tree = searchParams.get("tree") === "true";
    const slug = searchParams.get("slug");

    let query = "SELECT * FROM categories WHERE is_active = true";
    const params: any[] = [];

    if (slug) {
      query += " AND slug = $1";
      params.push(slug);
    } else if (level) {
      query += " AND level = $1";
      params.push(parseInt(level));
    } else if (parentId) {
      query += " AND parent_id = $1";
      params.push(parseInt(parentId));
    }

    query += " ORDER BY display_order ASC";

    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      const categories = result.rows as Category[];

      if (tree && !slug && !parentId) {
        const treeData = buildCategoryTree(categories);
        return NextResponse.json({ ok: true, categories: treeData });
      }

      return NextResponse.json({ ok: true, categories });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("[Categories API] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
