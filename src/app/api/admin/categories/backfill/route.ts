import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasTable } from "@/lib/db-features";
import { linkProductToMultipleCategories, analyzeProduct } from "@/lib/category-intelligence";

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

    const hasProductCategories = await hasTable('product_categories').catch(() => false);
    const hasCategories = await hasTable('categories').catch(() => false);
    
    if (!hasProductCategories || !hasCategories) {
      return NextResponse.json({ ok: false, error: "Required tables not found" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const forceRelink = body.forceRelink === true;

    const { data: products, error: fetchError } = await admin
      .from('products')
      .select('id, category, title, description')
      .order('id', { ascending: true });

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ ok: true, message: "No products found to backfill", processed: 0 });
    }

    let productsToProcess = products;
    
    if (!forceRelink) {
      const { data: existingLinks } = await admin
        .from('product_categories')
        .select('product_id')
        .limit(50000);

      const linkedProductIds = new Set((existingLinks || []).map((l: any) => l.product_id));
      
      const { data: multiLinkedProducts } = await admin
        .from('product_categories')
        .select('product_id')
        .limit(50000);
      
      const linkCounts = new Map<number, number>();
      for (const link of (multiLinkedProducts || [])) {
        const count = linkCounts.get(link.product_id) || 0;
        linkCounts.set(link.product_id, count + 1);
      }
      
      productsToProcess = products.filter(p => {
        const linkCount = linkCounts.get(p.id) || 0;
        return linkCount < 2;
      });
    }

    if (productsToProcess.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: "All products already have multi-category links", 
        totalProducts: products.length,
        processed: 0 
      });
    }

    let linked = 0;
    let failed = 0;
    let totalCategoriesAssigned = 0;
    const results: any[] = [];
    const categoryBreakdown: Record<string, number> = {};

    for (const product of productsToProcess) {
      const result = await linkProductToMultipleCategories(
        admin,
        product.id,
        product.title || "",
        product.description || "",
        product.category || ""
      );
      
      if (result.success) {
        linked++;
        totalCategoriesAssigned += result.categoriesLinked;
        
        for (const cat of result.details) {
          categoryBreakdown[cat.categoryName] = (categoryBreakdown[cat.categoryName] || 0) + 1;
        }
        
        if (results.length < 30) {
          results.push({
            productId: product.id,
            productTitle: product.title?.slice(0, 50),
            categoriesLinked: result.categoriesLinked,
            categories: result.details.slice(0, 5).map(d => ({
              name: d.categoryName,
              type: d.matchType
            }))
          });
        }
      } else {
        failed++;
      }
    }

    const avgCategoriesPerProduct = linked > 0 ? (totalCategoriesAssigned / linked).toFixed(1) : "0";

    const topCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      ok: true,
      totalProducts: products.length,
      processed: productsToProcess.length,
      linked,
      failed,
      totalCategoriesAssigned,
      avgCategoriesPerProduct,
      topCategories,
      sampleResults: results
    });
  } catch (e: any) {
    console.error("[Backfill] Error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 });
    }

    const { data: products } = await admin
      .from('products')
      .select('id, title, category')
      .limit(5000);

    const { data: productCategories } = await admin
      .from('product_categories')
      .select('product_id, category_id, is_primary')
      .limit(50000);

    const totalProducts = products?.length || 0;
    
    const linkCounts = new Map<number, number>();
    const primaryCounts = new Map<number, number>();
    
    for (const pc of (productCategories || [])) {
      const count = linkCounts.get(pc.product_id) || 0;
      linkCounts.set(pc.product_id, count + 1);
      
      if (pc.is_primary) {
        primaryCounts.set(pc.product_id, (primaryCounts.get(pc.product_id) || 0) + 1);
      }
    }
    
    let productsWithNoLinks = 0;
    let productsWithSingleLink = 0;
    let productsWithMultipleLinks = 0;
    
    for (const product of (products || [])) {
      const count = linkCounts.get(product.id) || 0;
      if (count === 0) {
        productsWithNoLinks++;
      } else if (count === 1) {
        productsWithSingleLink++;
      } else {
        productsWithMultipleLinks++;
      }
    }
    
    const needsBackfill = productsWithNoLinks + productsWithSingleLink;
    
    const sampleAnalysis: any[] = [];
    const sampleProducts = (products || []).slice(0, 3);
    
    for (const product of sampleProducts) {
      const analysis = await analyzeProduct(
        product.title || "",
        "",
        product.category || ""
      );
      
      sampleAnalysis.push({
        productId: product.id,
        title: product.title?.slice(0, 60),
        detectedGender: analysis.detectedGender,
        keywords: analysis.extractedKeywords.slice(0, 8),
        potentialCategories: analysis.matchedCategories.length
      });
    }

    return NextResponse.json({
      ok: true,
      totalProducts,
      stats: {
        noLinks: productsWithNoLinks,
        singleLink: productsWithSingleLink,
        multipleLinks: productsWithMultipleLinks
      },
      needsBackfill,
      fullyLinked: productsWithMultipleLinks,
      sampleAnalysis
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
