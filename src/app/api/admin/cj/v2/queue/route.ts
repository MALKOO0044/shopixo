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

export async function GET(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    const { data: products, error } = await supabase
      .from('product_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Queue fetch error:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const { data: batches } = await supabase
      .from('import_batches')
      .select('id, name, total_products, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    const stats = {
      pending: (products || []).filter(p => p.status === 'pending').length,
      approved: (products || []).filter(p => p.status === 'approved').length,
      rejected: (products || []).filter(p => p.status === 'rejected').length,
      imported: (products || []).filter(p => p.status === 'imported').length,
      total: (products || []).length
    }

    return NextResponse.json({
      ok: true,
      products: products || [],
      batches: batches || [],
      stats
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to load queue' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    const body = await req.json()
    const { products, batchName } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ ok: false, error: 'No products provided' }, { status: 400 })
    }

    const batchId = `batch_${Date.now()}`
    
    const { error: batchError } = await supabase
      .from('import_batches')
      .insert({
        id: batchId,
        name: batchName || `Import ${new Date().toLocaleDateString()}`,
        total_products: products.length,
        status: 'pending'
      })

    if (batchError) {
      console.error('Batch creation error:', batchError)
    }

    const queueItems = products.map((p: any) => ({
      batch_id: batchId,
      cj_product_id: p.id || p.cj_product_id,
      cj_sku: p.sku || p.productSku || p.id,
      name_en: p.nameEn || p.name,
      image_url: p.bigImage || p.image,
      cj_price_usd: parseFloat(p.sellPrice || p.pricing?.baseCostUSD || 0),
      shipping_usd: p.shippingUSD || p.pricing?.shippingUSD || 2.5,
      shipping_days: p.shippingDays || '7-15',
      final_price_sar: p.pricing?.roundedPriceSAR || p.pricing?.finalPriceSAR || 0,
      profit_sar: p.pricing?.profitSAR || 0,
      margin_percent: p.pricing?.actualMarginPercent || p.pricing?.marginPercent || 50,
      stock: p.warehouseInventoryNum || p.stock || 0,
      category_path: p.threeCategoryName || p.category || 'General',
      status: 'pending'
    }))

    const { error: insertError } = await supabase
      .from('product_queue')
      .insert(queueItems)

    if (insertError) {
      console.error('Queue insert error:', insertError)
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      batchId,
      addedCount: products.length
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Failed to add to queue' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabase()

    const body = await req.json()
    const { productIds, action, updates } = body

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ ok: false, error: 'No products specified' }, { status: 400 })
    }

    if (action === 'approve') {
      const { error } = await supabase
        .from('product_queue')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .in('id', productIds)

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
    } else if (action === 'reject') {
      const { error } = await supabase
        .from('product_queue')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .in('id', productIds)

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
    } else if (action === 'delete') {
      const { error } = await supabase
        .from('product_queue')
        .delete()
        .in('id', productIds)

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
    } else if (action === 'update' && updates) {
      const { error } = await supabase
        .from('product_queue')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .in('id', productIds)

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, affectedCount: productIds.length })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Action failed' }, { status: 500 })
  }
}
