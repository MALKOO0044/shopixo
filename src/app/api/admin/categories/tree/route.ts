import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  level: number;
  parentId: number | null;
  children?: CategoryNode[];
};

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

    const { data: allCategories, error } = await admin
      .from('categories')
      .select('id, name, slug, level, parent_id, sort_order')
      .eq('is_active', true)
      .order('level', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error("[Categories Tree] Query error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!allCategories || allCategories.length === 0) {
      return NextResponse.json({ ok: true, categories: [], total: 0 });
    }

    // Filter to only include FULL_CATEGORIES main categories (starting at id 371+)
    // These are the 14 main categories from FULL_CATEGORIES
    const fullCategorySlugs = [
      'womens-clothing', 'pet-supplies', 'home-garden-furniture', 'health-beauty-hair',
      'jewelry-watches', 'mens-clothing', 'bags-shoes', 'toys-kids-babies',
      'sports-outdoors', 'consumer-electronics', 'home-improvement', 
      'automobiles-motorcycles', 'phones-accessories', 'computer-office'
    ];
    
    const level1 = allCategories.filter(c => c.level === 1 && fullCategorySlugs.includes(c.slug));
    const level1Ids = new Set(level1.map(c => c.id));
    
    // Get level-2 that are children of our level-1
    const level2 = allCategories.filter(c => c.level === 2 && c.parent_id && level1Ids.has(c.parent_id));
    const level2Ids = new Set(level2.map(c => c.id));
    
    // Get level-3 that are children of our level-2
    const level3 = allCategories.filter(c => c.level === 3 && c.parent_id && level2Ids.has(c.parent_id));

    const tree: CategoryNode[] = level1.map(main => {
      const groups = level2
        .filter(g => g.parent_id === main.id)
        .map(group => {
          const items = level3
            .filter(item => item.parent_id === group.id)
            .map(item => ({
              id: item.id,
              name: item.name,
              slug: item.slug,
              level: item.level,
              parentId: item.parent_id,
            }));

          return {
            id: group.id,
            name: group.name,
            slug: group.slug,
            level: group.level,
            parentId: group.parent_id,
            children: items,
          };
        });

      return {
        id: main.id,
        name: main.name,
        slug: main.slug,
        level: main.level,
        parentId: main.parent_id,
        children: groups,
      };
    });

    return NextResponse.json({
      ok: true,
      categories: tree,
      total: allCategories.length,
      breakdown: {
        level1: level1.length,
        level2: level2.length,
        level3: level3.length,
      }
    });
  } catch (e: any) {
    console.error("[Categories Tree] Error:", e?.message);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
