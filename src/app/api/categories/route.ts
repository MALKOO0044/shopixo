import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
=======
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80

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

<<<<<<< HEAD
  roots.sort((a, b) => (a.display_order || a.id) - (b.display_order || b.id));
  roots.forEach(root => {
    if (root.children) {
      root.children.sort((a, b) => (a.display_order || a.id) - (b.display_order || b.id));
      root.children.forEach(child => {
        if (child.children) {
          child.children.sort((a, b) => (a.display_order || a.id) - (b.display_order || b.id));
=======
  roots.sort((a, b) => a.display_order - b.display_order);
  roots.forEach(root => {
    if (root.children) {
      root.children.sort((a, b) => a.display_order - b.display_order);
      root.children.forEach(child => {
        if (child.children) {
          child.children.sort((a, b) => a.display_order - b.display_order);
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
        }
      });
    }
  });

  return roots;
}

export async function GET(request: NextRequest) {
  try {
<<<<<<< HEAD
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("[Categories API] Supabase not configured");
=======
    if (!process.env.DATABASE_URL) {
      console.error("[Categories API] DATABASE_URL not configured");
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const parentId = searchParams.get("parent_id");
    const tree = searchParams.get("tree") === "true";
    const slug = searchParams.get("slug");

<<<<<<< HEAD
    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true);

    if (slug) {
      query = query.eq('slug', slug);
    } else if (level) {
      query = query.eq('level', parseInt(level));
    } else if (parentId) {
      query = query.eq('parent_id', parseInt(parentId));
    }

    query = query.order('id', { ascending: true });

    const { data: categories, error } = await query;

    if (error) {
      console.error("[Categories API] Supabase error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (tree && !slug && !parentId) {
      const treeData = buildCategoryTree(categories as Category[]);
      return NextResponse.json({ ok: true, categories: treeData });
    }

    return NextResponse.json({ ok: true, categories: categories || [] });
=======
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
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  } catch (e: any) {
    console.error("[Categories API] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
