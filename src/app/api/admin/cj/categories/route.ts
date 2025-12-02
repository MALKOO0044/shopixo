import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cj/v2";

export const dynamic = "force-dynamic";

type Feature = {
  featureId: string;
  featureName: string;
  level: number;
  parentId?: string;
  isProductCategory: boolean; // true = can be used for product search, false = grouping only
  childCategoryIds?: string[]; // Level 2 features include their Level 3 child IDs
};

type CategoryWithFeatures = { 
  categoryId: string; 
  categoryName: string;
  features: Feature[];
};

function buildCategoryHierarchy(nodes: any[]): CategoryWithFeatures[] {
  const result: CategoryWithFeatures[] = [];
  
  if (!Array.isArray(nodes)) return result;
  
  for (const firstLevel of nodes) {
    if (!firstLevel || typeof firstLevel !== 'object') continue;
    
    const firstId = firstLevel.categoryFirstId || firstLevel.categoryId || firstLevel.id;
    const firstName = firstLevel.categoryFirstName || firstLevel.categoryName || firstLevel.name;
    
    if (firstId && firstName) {
      const features: Feature[] = [];
      
      const secondLevelArray = firstLevel.categoryFirstList || firstLevel.categorySecond || firstLevel.children || [];
      if (Array.isArray(secondLevelArray)) {
        for (const secondLevel of secondLevelArray) {
          if (!secondLevel || typeof secondLevel !== 'object') continue;
          
          const secondId = secondLevel.categorySecondId || secondLevel.categoryId || secondLevel.id;
          const secondName = secondLevel.categorySecondName || secondLevel.categoryName || secondLevel.name;
          
          if (secondId && secondName) {
            const cleanSecondName = String(secondName).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            
            // Collect all Level 3 (leaf) category IDs under this Level 2 grouping
            const childCategoryIds: string[] = [];
            
            const thirdLevelArray = secondLevel.categorySecondList || secondLevel.categoryThird || secondLevel.children || [];
            if (Array.isArray(thirdLevelArray)) {
              for (const thirdLevel of thirdLevelArray) {
                if (!thirdLevel || typeof thirdLevel !== 'object') continue;
                
                const thirdId = thirdLevel.categoryThirdId || thirdLevel.categoryId || thirdLevel.id;
                const thirdName = thirdLevel.categoryThirdName || thirdLevel.categoryName || thirdLevel.name;
                
                if (thirdId && thirdName) {
                  const cleanThirdName = String(thirdName).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                  childCategoryIds.push(String(thirdId));
                  
                  // Level 3 = actual product category (can be used for search)
                  features.push({
                    featureId: String(thirdId),
                    featureName: `${cleanSecondName} > ${cleanThirdName}`,
                    level: 3,
                    parentId: String(secondId),
                    isProductCategory: true,
                  });
                }
              }
            }
            
            // Level 2 = grouping only (NOT a product category, but includes child IDs)
            features.push({
              featureId: String(secondId),
              featureName: cleanSecondName,
              level: 2,
              parentId: String(firstId),
              isProductCategory: false,
              childCategoryIds: childCategoryIds.length > 0 ? childCategoryIds : undefined,
            });
          }
        }
      }
      
      result.push({
        categoryId: String(firstId),
        categoryName: String(firstName),
        features,
      });
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
      
      const categories = buildCategoryHierarchy(rawCategories);
      const totalFeatures = categories.reduce((sum, cat) => sum + cat.features.length, 0);
      console.log("[CJ Categories] Categories count:", categories.length, "Total features:", totalFeatures);
      
      if (categories.length === 0 && rawCategories.length > 0) {
        console.log("[CJ Categories] WARNING: Raw data exists but parsing returned 0. Raw sample:", JSON.stringify(rawCategories.slice(0, 2)).slice(0, 1000));
      }
      
      return NextResponse.json({ 
        ok: true, 
        categories,
        total: categories.length,
        totalFeatures,
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
