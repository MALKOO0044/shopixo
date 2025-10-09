import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { isKillSwitchOn } from '@/lib/settings'
import { createClient } from '@supabase/supabase-js'
import { mapCjItemToProductLike, queryProductByPidOrKeyword } from '@/lib/cj/v2'
import { calculateRetailSar, usdToSar } from '@/lib/pricing'
import { hasTable } from '@/lib/db-features'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: Request) {
  const log = loggerForRequest(req)
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    if (await isKillSwitchOn()) return NextResponse.json({ ok: false, error: 'Kill switch is ON' }, { status: 423 })

    const admin = getAdmin()
    if (!admin) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 })
    const db = admin

    let body: any = {}
    try { body = await req.json() } catch {}
    const items: Array<{ cj_product_id: string; includeSkus?: string[]; category?: string; margin?: number; handlingSar?: number; cjCurrency?: 'USD'|'SAR' }> = Array.isArray(body?.selected) ? body.selected : []
    if (!items || items.length === 0) return NextResponse.json({ ok: false, error: 'selected array required' }, { status: 400 })

    const results: any[] = []

    for (const it of items) {
      try {
        const pid = String(it.cj_product_id)
        const raw = await queryProductByPidOrKeyword({ pid })
        const base = Array.isArray((raw as any)?.data?.content) ? (raw as any).data.content[0] : ((raw as any).data || raw)
        const cj = mapCjItemToProductLike(base)
        if (!cj) throw new Error('CJ map failed')

        // Collect product payload
        const images = cj.images || []
        const video = cj.videoUrl || null
        const category = it.category || 'General'
        const origin_area = (cj as any).originArea ?? null
        const origin_country_code = (cj as any).originCountryCode ?? null
        const delivery_time_hours = (cj as any).deliveryTimeHours ?? null
        const processing_time_hours = (cj as any).processingTimeHours ?? null
        // Try to derive a description from raw CJ base object
        const description = (() => {
          const fields = ['description','detail','details','productDescription','desc','salePoint','sellingPoint','sellingPoints'];
          for (const k of fields) {
            const v: any = (base as any)?.[k as any];
            if (typeof v === 'string' && v.trim()) return v.trim();
            if (Array.isArray(v)) {
              const s = v.map(x => (typeof x === 'string' ? x : '')).filter(Boolean).join('\n');
              if (s.trim()) return s.trim();
            }
          }
          return '';
        })()

        // Compute variant-level retail and totals
        const variants = (cj.variants || [])
        const rows: any[] = []
        let stockSum = 0
        let minRetailSansShip: number | null = null
        for (const v of variants) {
          // Filter by includeSkus if provided
          if (Array.isArray(it.includeSkus) && it.includeSkus.length > 0) {
            const sku = v.cjSku || null
            if (!sku || !it.includeSkus.includes(sku)) continue
          }
          const costUSD = typeof v.price === 'number' ? v.price : undefined
          const supplierCostSar = typeof costUSD === 'number' ? (it.cjCurrency === 'USD' ? usdToSar(costUSD) : costUSD) : undefined
          // build conservative dims/weights if absent
          const weightG = typeof v.weightGrams === 'number' ? Math.max(0, v.weightGrams) : undefined
          const L = typeof v.lengthCm === 'number' ? v.lengthCm : 25
          const W = typeof v.widthCm === 'number' ? v.widthCm : 20
          const H = typeof v.heightCm === 'number' ? v.heightCm : 3
          const actualKg = typeof weightG === 'number' ? Math.max(0.05, weightG / 1000) : 0.3

          let retailSar: number | null = null
          let ddpShippingSar: number | null = null
          let landedCostSar: number | null = null
          if (typeof supplierCostSar === 'number' && supplierCostSar > 0) {
            const calc = calculateRetailSar(supplierCostSar, { actualKg, lengthCm: L, widthCm: W, heightCm: H }, { margin: it.margin ?? 0.35, handlingSar: it.handlingSar ?? 0 })
            retailSar = calc.retailSar
            ddpShippingSar = calc.ddpShippingSar
            landedCostSar = calc.landedCostSar
            const sansShip = Math.max(0, retailSar - ddpShippingSar)
            if (minRetailSansShip === null || sansShip < minRetailSansShip) minRetailSansShip = sansShip
          }

          const stock = typeof v.stock === 'number' ? v.stock : 0
          stockSum += stock

          const color = (v as any).color || null
          const size = (v as any).size || null
          const optionValue = color ? (size ? `${color} / ${size}` : color) : (size || '-')
          rows.push({
            option_name: 'Variant',
            option_value: optionValue,
            cj_sku: v.cjSku || null,
            price: typeof retailSar === 'number' ? retailSar : null,
            stock,
            weight_grams: typeof weightG === 'number' ? Math.round(weightG) : null,
            length_cm: typeof v.lengthCm === 'number' ? v.lengthCm : null,
            width_cm: typeof v.widthCm === 'number' ? v.widthCm : null,
            height_cm: typeof v.heightCm === 'number' ? v.heightCm : null,
            supplier_cost_sar: typeof supplierCostSar === 'number' ? supplierCostSar : null,
            ddp_shipping_sar: typeof ddpShippingSar === 'number' ? ddpShippingSar : null,
            landed_cost_sar: typeof landedCostSar === 'number' ? landedCostSar : null,
            retail_sar: typeof retailSar === 'number' ? retailSar : null,
            retail_updated_at: new Date().toISOString(),
          })
        }

        // Upsert product
        const { data: existing } = await db.from('products').select('id, slug').eq('cj_product_id', cj.productId).maybeSingle()
        // Ensure unique slug, prefer existing slug else cj.productId
        async function ensureUniqueSlug(base: string): Promise<string> {
          let s = base.toLowerCase().replace(/[^a-z0-9\-]+/g, '-').replace(/^-+|-+$/g, '') || base;
          let candidate = s; let i = 2;
          while (true) {
            const { data } = await db.from('products').select('id').eq('slug', candidate).maybeSingle();
            if (!data) return candidate;
            candidate = `${s}-${i++}`;
          }
        }
        const slug = existing?.slug || await ensureUniqueSlug(cj.productId)
        const basePayload: any = {
          title: cj.name,
          slug,
          description,
          price: typeof minRetailSansShip === 'number' ? minRetailSansShip : 0,
          images,
          category,
          stock: stockSum,
          video_url: video,
          processing_time_hours,
          delivery_time_hours,
          origin_area,
          origin_country_code,
          cj_product_id: cj.productId,
          is_active: true,
        }
        let productId: number
        if (existing?.id) {
          const { data: upd, error } = await db.from('products').update(basePayload).eq('id', existing.id).select('id').single()
          if (error || !upd) throw error || new Error('Update failed')
          productId = upd.id as number
          await db.from('product_variants').delete().eq('product_id', productId)
        } else {
          const { data: ins, error } = await db.from('products').insert(basePayload).select('id').single()
          if (error || !ins) throw error || new Error('Insert failed')
          productId = ins.id as number
        }

        const hasVariants = await hasTable('product_variants').catch(() => true)
        if (hasVariants && rows.length > 0) {
          const finalRows = rows.map(r => ({ ...r, product_id: productId }))
          const { error } = await db.from('product_variants').insert(finalRows)
          if (error) throw error
        }
        try { await db.rpc('recompute_product_stock', { product_id_in: productId }) } catch {}

        results.push({ ok: true, productId, cjPid: cj.productId, title: cj.name })
      } catch (e: any) {
        results.push({ ok: false, error: e?.message || String(e) })
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'commit failed' }, { status: 500 })
    r.headers.set('x-request-id', loggerForRequest(req).requestId)
    return r
  }
}
