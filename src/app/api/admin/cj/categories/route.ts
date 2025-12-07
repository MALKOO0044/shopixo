import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cj/v2";

export const dynamic = "force-dynamic";

type CategoryNode = { 
  categoryId: string; 
  categoryName: string;
  children?: CategoryNode[];
};

function buildCategoryTree(nodes: any[]): CategoryNode[] {
  if (!Array.isArray(nodes)) return [];
  
  const result: CategoryNode[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const firstLevel = nodes[i];
    if (!firstLevel || typeof firstLevel !== 'object') continue;
    
    const firstName = firstLevel.categoryFirstName;
    if (!firstName) continue;
    
    const firstNode: CategoryNode = {
      categoryId: `first-${i}`,
      categoryName: String(firstName),
      children: [],
    };
    
    const firstList = firstLevel.categoryFirstList;
    if (Array.isArray(firstList)) {
      for (let j = 0; j < firstList.length; j++) {
        const secondLevel = firstList[j];
        if (!secondLevel || typeof secondLevel !== 'object') continue;
        
        const secondName = secondLevel.categorySecondName;
        if (!secondName) continue;
        
        const secondNode: CategoryNode = {
          categoryId: `second-${i}-${j}`,
          categoryName: String(secondName),
          children: [],
        };
        
        const secondList = secondLevel.categorySecondList;
        if (Array.isArray(secondList)) {
          for (const thirdLevel of secondList) {
            if (!thirdLevel || typeof thirdLevel !== 'object') continue;
            
            const thirdId = thirdLevel.categoryId;
            const thirdName = thirdLevel.categoryName;
            
            if (thirdId && thirdName) {
              secondNode.children!.push({
                categoryId: String(thirdId),
                categoryName: String(thirdName),
              });
            }
          }
        }
        
        if (secondNode.children!.length > 0) {
          firstNode.children!.push(secondNode);
        }
      }
    }
    
    if (firstNode.children!.length > 0) {
      result.push(firstNode);
    }
  }
  
  return result;
}

function countAllCategories(nodes: CategoryNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) {
      count += countAllCategories(node.children);
    }
  }
  return count;
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
    console.log("[CJ Categories] Response code:", data.code, "result:", data.result);
    
    if (data.code === 200 && data.data) {
      const rawCategories = Array.isArray(data.data) ? data.data : [];
      
      if (rawCategories.length > 0) {
        console.log("[CJ Categories] Sample first category:", rawCategories[0]?.categoryFirstName);
        const firstList = rawCategories[0]?.categoryFirstList;
        if (Array.isArray(firstList) && firstList.length > 0) {
          console.log("[CJ Categories] Sample second category:", firstList[0]?.categorySecondName);
          const secondList = firstList[0]?.categorySecondList;
          if (Array.isArray(secondList) && secondList.length > 0) {
            console.log("[CJ Categories] Sample third category:", secondList[0]?.categoryId, secondList[0]?.categoryName);
          }
        }
      }
      
      const categories = buildCategoryTree(rawCategories);
      const totalCount = countAllCategories(categories);
      console.log("[CJ Categories] Tree built:", categories.length, "top-level categories,", totalCount, "total nodes");
      
      if (categories.length === 0 && rawCategories.length > 0) {
        console.log("[CJ Categories] WARNING: Raw data exists but tree is empty. Check parsing logic.");
        console.log("[CJ Categories] Raw sample:", JSON.stringify(rawCategories[0]).slice(0, 500));
      }
      
      return NextResponse.json({ 
        ok: true, 
        categories,
        total: totalCount,
        rawCount: rawCategories.length,
      });
    }

    console.log("[CJ Categories] API error:", data.code, data.message);
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
