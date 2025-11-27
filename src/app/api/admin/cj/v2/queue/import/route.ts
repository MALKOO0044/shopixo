import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function POST(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    const { data: approved, error: fetchError } = await supabase
      .from('product_queue')
      .select('*')
      .eq('status', 'approved')
      .limit(100)

    if (fetchError) {
      return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 })
    }

    if (!approved || approved.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No approved products to import',
        stats: { success: 0, failed: 0 }
      })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const item of approved) {
      try {
        const category = item.category_path?.split('>').pop()?.trim() || 'General'
        
        const slug = slugify(item.name_en || item.cj_sku) + '-' + Date.now().toString(36)
        
        const productData = {
          slug,
          title: item.name_en,
          description: `High quality ${item.name_en}. Fast shipping to Saudi Arabia. ${item.name_en} عالية الجودة. شحن سريع إلى المملكة العربية السعودية.`,
          price: item.final_price_sar,
          images: item.image_url ? [item.image_url] : [],
          category,
          is_active: true,
          stock: Math.max(0, item.stock - 5),
          cj_product_id: item.cj_product_id,
          rating: 0,
          variants: []
        }

        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('cj_product_id', item.cj_product_id)
          .single()

        if (existingProduct) {
          const { error: updateError } = await supabase
            .from('products')
            .update({
              price: productData.price,
              stock: productData.stock,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProduct.id)

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('products')
            .insert(productData)

          if (insertError) throw insertError
        }

        await supabase
          .from('product_queue')
          .update({ status: 'imported', updated_at: new Date().toISOString() })
          .eq('id', item.id)

        results.success++
      } catch (e: any) {
        results.failed++
        results.errors.push(`${item.name_en}: ${e?.message || 'Unknown error'}`)
        console.error(`Import failed for ${item.cj_sku}:`, e)
      }
    }

    const batchIds = [...new Set(approved.map(p => p.batch_id).filter(Boolean))]
    for (const batchId of batchIds) {
      const { data: batchProducts } = await supabase
        .from('product_queue')
        .select('status')
        .eq('batch_id', batchId)

      const allImported = batchProducts?.every(p => p.status === 'imported')
      if (allImported) {
        await supabase
          .from('import_batches')
          .update({ status: 'completed' })
          .eq('id', batchId)
      }
    }

    return NextResponse.json({
      ok: true,
      stats: {
        success: results.success,
        failed: results.failed
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Import failed' }, { status: 500 })
  }
}
