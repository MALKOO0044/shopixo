import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface LocalCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
}

interface MappingResult {
  cjCategoryId: string;
  cjCategoryName: string;
  localCategoryId: number | null;
  localCategorySlug: string | null;
  localCategoryPath: string | null;
  confidence: number;
}

function normalizeForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/&/g, "and")
    .replace(/[^\w\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  const normA = normalizeForMatch(a);
  const normB = normalizeForMatch(b);
  
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;
  
  const wordsA = new Set(normA.split(" "));
  const wordsB = new Set(normB.split(" "));
  const intersection = [...wordsA].filter(w => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  const jaccard = intersection.length / union.size;
  
  return jaccard * 0.8;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cjCategories } = body;
    
    if (!Array.isArray(cjCategories)) {
      return NextResponse.json({ ok: false, error: "cjCategories array required" });
    }
    
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, name, slug, parent_id, level FROM categories WHERE is_active = true ORDER BY level, display_order"
      );
      const localCategories = result.rows as LocalCategory[];
      
      const categoryPathMap = new Map<number, string>();
      for (const cat of localCategories) {
        if (cat.level === 1) {
          categoryPathMap.set(cat.id, cat.name);
        } else {
          const parentPath = categoryPathMap.get(cat.parent_id!) || "";
          categoryPathMap.set(cat.id, parentPath ? `${parentPath} > ${cat.name}` : cat.name);
        }
      }
      
      const mappings: MappingResult[] = [];
      
      for (const cjCat of cjCategories) {
        const { categoryId, categoryName, level: cjLevel } = cjCat;
        
        let bestMatch: LocalCategory | null = null;
        let bestScore = 0;
        
        const targetLevel = cjLevel || 3;
        const levelCandidates = localCategories.filter(c => c.level === targetLevel);
        
        for (const local of levelCandidates) {
          const score = calculateSimilarity(categoryName, local.name);
          if (score > bestScore && score >= 0.5) {
            bestScore = score;
            bestMatch = local;
          }
        }
        
        if (!bestMatch && targetLevel === 3) {
          for (const local of localCategories.filter(c => c.level === 2)) {
            const score = calculateSimilarity(categoryName, local.name);
            if (score > bestScore && score >= 0.5) {
              bestScore = score;
              bestMatch = local;
            }
          }
        }
        
        mappings.push({
          cjCategoryId: categoryId,
          cjCategoryName: categoryName,
          localCategoryId: bestMatch?.id || null,
          localCategorySlug: bestMatch?.slug || null,
          localCategoryPath: bestMatch ? categoryPathMap.get(bestMatch.id) || null : null,
          confidence: bestScore,
        });
      }
      
      return NextResponse.json({ ok: true, mappings });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("[Category Mapping] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Mapping failed" });
  }
}

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.level,
          c.parent_id,
          p.name as parent_name,
          p.slug as parent_slug
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.is_active = true
        ORDER BY c.level, c.display_order
      `);
      
      const categories = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        level: row.level,
        parentId: row.parent_id,
        parentName: row.parent_name,
        parentSlug: row.parent_slug,
      }));
      
      return NextResponse.json({ ok: true, categories });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("[Category Mapping GET] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Failed to fetch categories" });
  }
}
