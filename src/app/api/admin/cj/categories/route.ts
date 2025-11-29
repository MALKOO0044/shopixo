import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cj/v2";

export const dynamic = "force-dynamic";

type FlatCategory = { categoryId: string; categoryName: string };

function extractNodeInfo(node: any): { id: string; name: string } {
  const id = node.categoryThirdId || node.categorySecondId || node.categoryFirstId || 
             node.categoryId || node.id || "";
  const name = node.categoryThirdName || node.categorySecondName || node.categoryFirstName || 
               node.categoryName || node.name || "";
  return { id: String(id), name: String(name) };
}

function flattenCategories(nodes: any[], parentPath = ""): FlatCategory[] {
  const result: FlatCategory[] = [];
  const seenPaths = new Set<string>();
  
  if (!Array.isArray(nodes)) return result;
  
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue;
    
    const { id, name } = extractNodeInfo(node);
    const fullPath = parentPath ? `${parentPath} > ${name}` : name;
    const uniqueKey = `${id}:${fullPath}`;
    
    if (id && name && !seenPaths.has(uniqueKey)) {
      seenPaths.add(uniqueKey);
      result.push({ categoryId: id, categoryName: fullPath });
    }
    
    const childArrays = [
      node.categorySecond,
      node.categoryThird,
      node.children,
      node.subCategories,
    ];
    
    for (const children of childArrays) {
      if (Array.isArray(children) && children.length > 0) {
        const childResults = flattenCategories(children, id && name ? fullPath : parentPath);
        for (const child of childResults) {
          const childKey = `${child.categoryId}:${child.categoryName}`;
          if (!seenPaths.has(childKey)) {
            seenPaths.add(childKey);
            result.push(child);
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
      
      const categories = flattenCategories(rawCategories);
      console.log("[CJ Categories] Flattened count:", categories.length);
      
      if (categories.length === 0 && rawCategories.length > 0) {
        console.log("[CJ Categories] WARNING: Raw data exists but flattening returned 0. Raw sample:", JSON.stringify(rawCategories.slice(0, 2)).slice(0, 1000));
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
