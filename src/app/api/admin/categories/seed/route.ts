import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { FULL_CATEGORIES } from "@/lib/categories";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
    }

    console.log('[Category Seed] Starting category seeding...');
    console.log('[Category Seed] FULL_CATEGORIES count:', FULL_CATEGORIES.length);

    const results: { mainCategories: number; childCategories: number; groupCategories: number; errors: string[] } = {
      mainCategories: 0,
      childCategories: 0,
      groupCategories: 0,
      errors: []
    };

    for (const main of FULL_CATEGORIES) {
      try {
        console.log('[Category Seed] Processing main:', main.slug, 'groups:', main.groups?.length || 0);
        
        const { data: existingMain } = await admin
          .from('categories')
          .select('id')
          .eq('slug', main.slug)
          .maybeSingle();

        let mainId: number;

        if (existingMain) {
          mainId = existingMain.id;
          console.log('[Category Seed] Main exists:', main.slug, 'id:', mainId);
        } else {
          const { data: newMain, error: mainErr } = await admin
            .from('categories')
            .insert({
              name: main.label,
              slug: main.slug,
              parent_id: null,
              level: 1,
              image_url: main.image || null,
              is_active: true,
              sort_order: FULL_CATEGORIES.indexOf(main)
            })
            .select('id')
            .single();

          if (mainErr) {
            results.errors.push(`Main category ${main.slug}: ${mainErr.message}`);
            continue;
          }
          mainId = newMain.id;
          results.mainCategories++;
        }

        // Handle FULL_CATEGORIES structure with groups > items (3-level hierarchy)
        if (main.groups && main.groups.length > 0) {
          console.log('[Category Seed] Processing', main.groups.length, 'groups for', main.slug);
          let groupOrder = 0;
          for (const group of main.groups) {
            // Create group as level 2 category
            const groupSlug = `${main.slug}-${group.groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
            console.log('[Category Seed] Creating group:', groupSlug, 'parent:', mainId);
            
            let groupId: number;
            const { data: existingGroup } = await admin
              .from('categories')
              .select('id')
              .eq('slug', groupSlug)
              .maybeSingle();
            
            if (existingGroup) {
              groupId = existingGroup.id;
            } else {
              const { data: newGroup, error: groupErr } = await admin
                .from('categories')
                .insert({
                  name: group.groupName,
                  slug: groupSlug,
                  parent_id: mainId,
                  level: 2,
                  is_active: true,
                  sort_order: groupOrder++
                })
                .select('id')
                .single();
              
              if (groupErr) {
                results.errors.push(`Group ${groupSlug}: ${groupErr.message}`);
                continue;
              }
              groupId = newGroup.id;
              results.childCategories++;
            }
            
            // Create items as level 3 categories under the group
            if (group.items && group.items.length > 0) {
              let itemOrder = 0;
              for (const item of group.items) {
                try {
                  const { data: existingItem } = await admin
                    .from('categories')
                    .select('id')
                    .eq('slug', item.slug)
                    .maybeSingle();
                  
                  if (!existingItem) {
                    const { error: itemErr } = await admin
                      .from('categories')
                      .insert({
                        name: item.label,
                        slug: item.slug,
                        parent_id: groupId,
                        level: 3,
                        is_active: true,
                        sort_order: itemOrder++
                      });
                    
                    if (itemErr) {
                      results.errors.push(`Item ${item.slug}: ${itemErr.message}`);
                    } else {
                      results.childCategories++;
                    }
                  }
                } catch (e: any) {
                  results.errors.push(`Item ${item.slug}: ${e?.message}`);
                }
              }
            }
          }
        }
        
        // Also handle legacy children structure if present
        if (main.children && main.children.length > 0) {
          for (let i = 0; i < main.children.length; i++) {
            const child = main.children[i];
            try {
              const { data: existingChild } = await admin
                .from('categories')
                .select('id')
                .eq('slug', child.slug)
                .maybeSingle();

              if (!existingChild) {
                const { error: childErr } = await admin
                  .from('categories')
                  .insert({
                    name: child.label,
                    slug: child.slug,
                    parent_id: mainId,
                    level: 2,
                    image_url: child.image || null,
                    is_active: true,
                    sort_order: i
                  });

                if (childErr) {
                  results.errors.push(`Child category ${child.slug}: ${childErr.message}`);
                } else {
                  results.childCategories++;
                }
              }
            } catch (e: any) {
              results.errors.push(`Child ${child.slug}: ${e?.message}`);
            }
          }
        }
      } catch (e: any) {
        results.errors.push(`Main ${main.slug}: ${e?.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Seeded ${results.mainCategories} main categories and ${results.childCategories} child categories`,
      ...results
    });
  } catch (e: any) {
    console.error("[Categories Seed] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { data: categories, error } = await admin
      .from('categories')
      .select('id, name, slug, parent_id, level')
      .order('level')
      .order('sort_order');

    if (error) {
      if (/does not exist/i.test(error.message)) {
        return NextResponse.json({
          ok: false,
          error: "Categories table does not exist. Please run the SQL to create it first.",
          sql: `CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);`
        }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const mainCategories = categories?.filter(c => c.level === 1) || [];
    const childCategories = categories?.filter(c => c.level === 2) || [];

    return NextResponse.json({
      ok: true,
      totalCategories: categories?.length || 0,
      mainCategories: mainCategories.length,
      childCategories: childCategories.length,
      expectedMain: FULL_CATEGORIES.length,
      expectedChildren: FULL_CATEGORIES.reduce((sum, c) => sum + (c.children?.length || 0), 0),
      needsSeeding: mainCategories.length < FULL_CATEGORIES.length
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
