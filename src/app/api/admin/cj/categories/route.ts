import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cj/v2";

export const dynamic = "force-dynamic";

type FlatCategory = { 
  categoryId: string; 
  categoryName: string;
  level: number;
  parentId?: string;
};

function buildCategoryTree(nodes: any[]): FlatCategory[] {
  const result: FlatCategory[] = [];
  
  if (!Array.isArray(nodes)) return result;
  
  for (const firstLevel of nodes) {
    if (!firstLevel || typeof firstLevel !== 'object') continue;
    
    const firstId = firstLevel.categoryFirstId || firstLevel.categoryId || firstLevel.id;
    const firstName = firstLevel.categoryFirstName || firstLevel.categoryName || firstLevel.name;
    
    if (firstId && firstName) {
      result.push({
        categoryId: String(firstId),
        categoryName: String(firstName),
        level: 1,
      });
      
      const secondLevelArray = firstLevel.categorySecond || firstLevel.children || [];
      if (Array.isArray(secondLevelArray)) {
        for (const secondLevel of secondLevelArray) {
          if (!secondLevel || typeof secondLevel !== 'object') continue;
          
          const secondId = secondLevel.categorySecondId || secondLevel.categoryId || secondLevel.id;
          const secondName = secondLevel.categorySecondName || secondLevel.categoryName || secondLevel.name;
          
          if (secondId && secondName) {
            result.push({
              categoryId: String(secondId),
              categoryName: `${firstName} > ${secondName}`,
              level: 2,
              parentId: String(firstId),
            });
            
            const thirdLevelArray = secondLevel.categoryThird || secondLevel.children || [];
            if (Array.isArray(thirdLevelArray)) {
              for (const thirdLevel of thirdLevelArray) {
                if (!thirdLevel || typeof thirdLevel !== 'object') continue;
                
                const thirdId = thirdLevel.categoryThirdId || thirdLevel.categoryId || thirdLevel.id;
                const thirdName = thirdLevel.categoryThirdName || thirdLevel.categoryName || thirdLevel.name;
                
                if (thirdId && thirdName) {
                  result.push({
                    categoryId: String(thirdId),
                    categoryName: `${firstName} > ${secondName} > ${thirdName}`,
                    level: 3,
                    parentId: String(secondId),
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  
  return result;
}

export async function GET() {
  try {
    const apiKey = process.env.CJ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "CJ API key not configured" });
    }

    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: "Failed to authenticate with CJ" });
    }

    const base = process.env.CJ_API_BASE || "https://developers.cjdropshipping.com/api2.0/v1";
    const res = await fetch(`${base}/product/getCategory`, {
      headers: {
        "CJ-Access-Token": token,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();
    console.log("[CJ Categories] Response code:", data.code, "data type:", typeof data.data, "is array:", Array.isArray(data.data));
    
    if (data.code === 200 && data.data) {
      const rawCategories = Array.isArray(data.data) ? data.data : [];
      
      if (rawCategories.length > 0) {
        console.log("[CJ Categories] First category sample:", JSON.stringify(rawCategories[0]).slice(0, 500));
      }
      
      const categories = buildCategoryTree(rawCategories);
      console.log("[CJ Categories] Tree count:", categories.length, "First level:", categories.filter(c => c.level === 1).length);
      
      if (categories.length === 0 && rawCategories.length > 0) {
        console.log("[CJ Categories] WARNING: Raw data exists but parsing returned 0. Raw sample:", JSON.stringify(rawCategories.slice(0, 2)).slice(0, 1000));
      }
      
      return NextResponse.json({ 
        ok: true, 
        categories,
        total: categories.length,
        rawCount: rawCategories.length,
      });
    }

    console.log("[CJ Categories] No data in response:", JSON.stringify(data).slice(0, 500));
    return NextResponse.json({ 
      ok: true, 
      categories: [],
      message: "Connected but no categories found",
      debug: { code: data.code, message: data.message }
    });
  } catch (e: any) {
    console.error("[CJ Categories] Error:", e?.message);
    return NextResponse.json({ ok: false, error: e?.message || "Connection failed" });
  }
}
