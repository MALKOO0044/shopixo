import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/cj/v2";

export const dynamic = "force-dynamic";

type FlatCategory = { categoryId: string; categoryName: string };

function flattenCategories(nodes: any[], parentName = ""): FlatCategory[] {
  const result: FlatCategory[] = [];
  
  for (const node of nodes) {
    const id = node.categoryId || node.id || "";
    const name = node.categoryName || node.name || node.categoryFirstName || "";
    const fullName = parentName ? `${parentName} > ${name}` : name;
    
    if (id && name) {
      result.push({ categoryId: String(id), categoryName: fullName });
    }
    
    if (Array.isArray(node.children) && node.children.length > 0) {
      result.push(...flattenCategories(node.children, fullName));
    }
    if (Array.isArray(node.categorySecond) && node.categorySecond.length > 0) {
      result.push(...flattenCategories(node.categorySecond, fullName));
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
    
    if (data.code === 200 && data.data) {
      const rawCategories = Array.isArray(data.data) ? data.data : [];
      const categories = flattenCategories(rawCategories);
      
      return NextResponse.json({ 
        ok: true, 
        categories,
        total: categories.length,
      });
    }

    return NextResponse.json({ 
      ok: true, 
      categories: [],
      message: "Connected but no categories found"
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Connection failed" });
  }
}
