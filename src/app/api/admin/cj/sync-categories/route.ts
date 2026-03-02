import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAccessToken } from "@/lib/cj/v2";
import { hasColumn } from "@/lib/db-features";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RootCategoryRow = {
  id: number;
  name: string;
};

type CjCategoryLinkRow = {
  category_id?: number | null;
  local_category_id?: number | null;
};

function readEnv(name: string): string | undefined {
  const env = (globalThis as any)?.process?.env;
  const value = env?.[name];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getSupabaseAdmin() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

const CATEGORY_MAPPING: Record<string, { localCategoryId: number; keywords: string[] }> = {
  "Women's Clothing": { localCategoryId: 1, keywords: ["women", "woman", "ladies", "female", "dress", "blouse", "skirt"] },
  "Pet Supplies": { localCategoryId: 2, keywords: ["pet", "dog", "cat", "bird", "fish", "animal"] },
  "Home, Garden & Furniture": { localCategoryId: 3, keywords: ["home", "garden", "furniture", "decor", "kitchen", "bedding", "curtain"] },
  "Health, Beauty & Hair": { localCategoryId: 4, keywords: ["health", "beauty", "hair", "makeup", "skincare", "nail", "cosmetic"] },
  "Jewelry & Watches": { localCategoryId: 5, keywords: ["jewelry", "jewellery", "watch", "ring", "necklace", "bracelet", "earring"] },
  "Men's Clothing": { localCategoryId: 6, keywords: ["men", "man", "male", "gentleman"] },
  "Bags & Shoes": { localCategoryId: 7, keywords: ["bag", "shoe", "handbag", "backpack", "wallet", "boots", "sneaker", "sandal"] },
  "Toys, Kids & Babies": { localCategoryId: 8, keywords: ["toy", "kid", "baby", "child", "game", "puzzle", "doll"] },
  "Sports & Outdoors": { localCategoryId: 9, keywords: ["sport", "outdoor", "fitness", "gym", "camping", "hiking", "bicycle", "yoga"] },
  "Consumer Electronics": { localCategoryId: 10, keywords: ["electronic", "audio", "video", "camera", "headphone", "speaker", "tv"] },
  "Home Improvement": { localCategoryId: 11, keywords: ["tool", "lighting", "lamp", "hardware", "plumbing", "electrical"] },
  "Automobiles & Motorcycles": { localCategoryId: 12, keywords: ["car", "auto", "vehicle", "motorcycle", "motor", "truck"] },
  "Phones & Accessories": { localCategoryId: 13, keywords: ["phone", "mobile", "cellphone", "smartphone", "tablet", "iphone", "samsung"] },
  "Computer & Office": { localCategoryId: 14, keywords: ["computer", "laptop", "office", "printer", "keyboard", "mouse", "monitor"] },
};

function findBestCategoryMatch(cjCategoryName: string, cjParentName?: string): { categoryId: number; confidence: number } | null {
  const searchText = `${cjCategoryName} ${cjParentName || ""}`.toLowerCase();
  
  let bestMatch: { categoryId: number; confidence: number } | null = null;
  
  for (const [categoryName, config] of Object.entries(CATEGORY_MAPPING)) {
    let score = 0;
    
    if (searchText.includes(categoryName.toLowerCase())) {
      score = 100;
    } else {
      for (const keyword of config.keywords) {
        if (searchText.includes(keyword)) {
          score += 15;
        }
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.confidence)) {
      bestMatch = { categoryId: config.localCategoryId, confidence: Math.min(score / 100, 0.99) };
    }
  }
  
  return bestMatch;
}

export async function POST() {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const [hasCategoryIdColumn, hasLegacyLocalCategoryIdColumn] = await Promise.all([
      hasColumn('cj_category_links', 'category_id').catch(() => false),
      hasColumn('cj_category_links', 'local_category_id').catch(() => false),
    ]);

    if (!hasCategoryIdColumn && !hasLegacyLocalCategoryIdColumn) {
      return NextResponse.json(
        {
          ok: false,
          error: "cj_category_links is missing both category_id and local_category_id columns",
        },
        { status: 500 }
      );
    }

    const apiKey = readEnv("CJ_API_KEY");
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "CJ API key not configured" }, { status: 500 });
    }

    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: "Failed to authenticate with CJ" }, { status: 500 });
    }

    const base = readEnv("CJ_API_BASE") || "https://developers.cjdropshipping.com/api2.0/v1";
    const res = await fetch(`${base}/product/getCategory`, {
      headers: {
        "CJ-Access-Token": token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    
    if (data.code !== 200 || !data.data) {
      return NextResponse.json({ ok: false, error: "Failed to fetch CJ categories" }, { status: 500 });
    }

    const rawCategories = Array.isArray(data.data) ? data.data : [];
    const linksToInsert: Array<Record<string, unknown>> = [];
    let totalProcessed = 0;
    let totalMapped = 0;

    for (let i = 0; i < rawCategories.length; i++) {
      const firstLevel = rawCategories[i];
      if (!firstLevel || typeof firstLevel !== 'object') continue;
      
      const firstName = firstLevel.categoryFirstName;
      if (!firstName) continue;

      const firstList = firstLevel.categoryFirstList;
      if (!Array.isArray(firstList)) continue;

      for (let j = 0; j < firstList.length; j++) {
        const secondLevel = firstList[j];
        if (!secondLevel || typeof secondLevel !== 'object') continue;
        
        const secondName = secondLevel.categorySecondName;
        if (!secondName) continue;

        const secondList = secondLevel.categorySecondList;
        if (!Array.isArray(secondList)) continue;

        for (const thirdLevel of secondList) {
          if (!thirdLevel || typeof thirdLevel !== 'object') continue;
          
          const cjCategoryId = thirdLevel.categoryId;
          const cjCategoryName = thirdLevel.categoryName;
          
          if (!cjCategoryId || !cjCategoryName) continue;
          
          totalProcessed++;
          
          const match = findBestCategoryMatch(cjCategoryName, `${firstName} ${secondName}`);
          
          if (match) {
            totalMapped++;
            const linkRow: Record<string, unknown> = {
              cj_category_id: String(cjCategoryId),
              cj_category_name: String(cjCategoryName),
              cj_parent_id: `${firstName} > ${secondName}`,
              cj_level: 3,
              confidence: match.confidence,
              notes: `Auto-mapped from CJ: ${firstName} > ${secondName} > ${cjCategoryName}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (hasCategoryIdColumn) {
              linkRow.category_id = match.categoryId;
            }
            if (hasLegacyLocalCategoryIdColumn) {
              linkRow.local_category_id = match.categoryId;
            }
            linksToInsert.push(linkRow);
          }
        }
      }
    }

    await admin.from('cj_category_links').delete().neq('id', 0);

    if (linksToInsert.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < linksToInsert.length; i += batchSize) {
        const batch = linksToInsert.slice(i, i + batchSize);
        const { error } = await admin.from('cj_category_links').insert(batch);
        if (error) {
          console.error(`[CJ Sync] Batch insert error:`, error);
        }
      }
    }

    const { count } = await admin.from('cj_category_links').select('*', { count: 'exact', head: true });

    return NextResponse.json({
      ok: true,
      message: `Synced ${count} CJ category mappings`,
      stats: {
        totalCjCategories: totalProcessed,
        mappedCategories: totalMapped,
        savedToDatabase: count,
      }
    });

  } catch (e: any) {
    console.error("[CJ Sync] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Sync failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 500 });
    }

    const [hasCategoryIdColumn, hasLegacyLocalCategoryIdColumn] = await Promise.all([
      hasColumn('cj_category_links', 'category_id').catch(() => false),
      hasColumn('cj_category_links', 'local_category_id').catch(() => false),
    ]);

    const selectColumns = [
      'cj_category_id',
      'cj_category_name',
      'confidence',
      ...(hasCategoryIdColumn ? ['category_id'] : []),
      ...(hasLegacyLocalCategoryIdColumn ? ['local_category_id'] : []),
    ];
    const orderColumn = hasCategoryIdColumn
      ? 'category_id'
      : hasLegacyLocalCategoryIdColumn
        ? 'local_category_id'
        : 'cj_category_id';

    const { data, count, error } = await admin
      .from('cj_category_links')
      .select(selectColumns.join(', '), { count: 'exact' })
      .order(orderColumn)
      .limit(100);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const { data: categories } = await admin
      .from('categories')
      .select('id, name')
      .eq('level', 1);

    const linkRows: CjCategoryLinkRow[] = Array.isArray(data) ? (data as CjCategoryLinkRow[]) : [];
    const rootCategories: RootCategoryRow[] = Array.isArray(categories) ? (categories as RootCategoryRow[]) : [];

    const categoryStats = rootCategories.map((cat: RootCategoryRow) => {
      const links = linkRows.filter((l: CjCategoryLinkRow) => {
        const linkedCategoryId = Number(
          (hasCategoryIdColumn ? l?.category_id : undefined) ??
          (hasLegacyLocalCategoryIdColumn ? l?.local_category_id : undefined) ??
          0
        );
        return linkedCategoryId === cat.id;
      });
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        mappedCjCategories: links.length,
      };
    });

    return NextResponse.json({
      ok: true,
      totalMappings: count,
      categoryStats,
      sampleMappings: (data || []).slice(0, 20),
    });

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to get mappings" }, { status: 500 });
  }
}
