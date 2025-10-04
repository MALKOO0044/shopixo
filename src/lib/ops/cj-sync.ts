import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slug'
import { hasTable, hasColumn } from '@/lib/db-features'
import type { CjProductLike } from '@/lib/cj/v2'
import { freightCalculate } from '@/lib/cj/v2'
import { loadPricingPolicy } from '@/lib/pricing-policy'
import { computeRetailFromLanded, convertToSar } from '@/lib/pricing'

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined
  if (!url || !key) return null
  return createClient(url, key)
}

export async function productVariantsTableExists(): Promise<boolean> {
  return await hasTable('product_variants')
}

async function ensureUniqueSlug(admin: SupabaseClient, base: string): Promise<string> {
  const s = slugify(base)
  let candidate = s
  for (let i = 2; i <= 50; i++) {
    const { data } = await admin.from('products').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
    candidate = `${s}-${i}`
  }
  return `${s}-${Date.now()}`
}

export type UpsertOptions = {
  updateImages?: boolean
  updateVideo?: boolean
  updatePrice?: boolean
}

export async function upsertProductFromCj(cj: CjProductLike, options: UpsertOptions = {}): Promise<{ ok: true; productId: number; updated: string[] } | { ok: false; error: string }>{
  const admin = getSupabaseAdmin()
  if (!admin) return { ok: false, error: 'Supabase not configured' }

  try {
    // Find existing by cj_product_id when column exists
    let existing: any = null
    if (await hasColumn('products', 'cj_product_id')) {
      const resp = await admin.from('products').select('id, slug, price').eq('cj_product_id', cj.productId).maybeSingle()
      existing = resp.data || null
    }

    const baseSlug = await ensureUniqueSlug(admin, cj.name)
    const priceCandidates = (cj.variants || []).map((v) => (typeof v.price === 'number' ? v.price : NaN)).filter((n) => !isNaN(n))
    const minVariantPrice = priceCandidates.length > 0 ? Math.min(...priceCandidates) : 0
    const minVariant = (cj.variants || []).reduce<{ price: number; sku?: string } | null>((best, v) => {
      const p = typeof v.price === 'number' ? v.price : NaN
      if (isNaN(p)) return best
      if (!best || p < best.price) return { price: p, sku: v.cjSku }
      return best
    }, null)

    const totalStock = (cj.variants || []).reduce((acc, v) => acc + (typeof v.stock === 'number' ? v.stock : 0), 0)

    const productPayload: any = {
      title: cj.name,
      slug: existing?.slug || baseSlug,
      price: existing?.price ?? minVariantPrice,
      category: 'Women',
      stock: totalStock,
      cj_product_id: cj.productId,
    }

    const optional: Record<string, any> = {
      images: options.updateImages ? (cj.images || []) : undefined,
      video_url: options.updateVideo ? (cj.videoUrl || null) : undefined,
    }

    // Prune undefineds and columns that don't exist
    const toPrune = Object.keys(optional)
    for (const c of toPrune) {
      if (optional[c] === undefined) delete optional[c]
      else {
        const exists = await hasColumn('products', c)
        if (!exists) delete optional[c]
      }
    }

    const updated: string[] = []

    let productId: number
    if (existing?.id) {
      const { data: upd, error: upErr } = await admin
        .from('products')
        .update({ ...productPayload, ...optional })
        .eq('id', existing.id)
        .select('id')
        .single()
      if (upErr || !upd) throw upErr || new Error('Failed to update product')
      productId = upd.id as number
      updated.push('product')
    } else {
      // Insert with slug conflict retry
      let insRes: any = null
      try {
        const { data: ins, error: insErr } = await admin.from('products').insert(productPayload).select('id').single()
        if (insErr || !ins) throw insErr || new Error('Failed to insert product')
        insRes = ins
      } catch (e: any) {
        const msg = String(e?.message || e || '')
        if (/duplicate key|unique constraint|unique violation|already exists/i.test(msg)) {
          const base = productPayload.slug || slugify(cj.name)
          productPayload.slug = await ensureUniqueSlug(admin, base)
          const { data: ins2, error: err2 } = await admin.from('products').insert(productPayload).select('id').single()
          if (err2 || !ins2) throw err2 || new Error('Failed to insert product (retry)')
          insRes = ins2
        } else {
          throw e
        }
      }
      productId = insRes.id as number
      updated.push('product')
    }

    // Recalculate retail price with shipping + margin when requested
    if (options.updatePrice) {
      try {
        const policy = await loadPricingPolicy()
        let shippingSar = 0
        try {
          const fc = await freightCalculate({ countryCode: 'SA', pid: cj.productId, sku: minVariant?.sku, quantity: 1 })
          const cheapest = (fc.options || []).reduce<{ price: number; currency?: string } | null>((best, opt) => {
            const p = Number(opt.price || 0)
            if (!best || p < best.price) return { price: p, currency: opt.currency }
            return best
          }, null)
          if (cheapest) shippingSar = convertToSar(cheapest.price, cheapest.currency)
        } catch {}

        const baseCostSar = typeof minVariantPrice === 'number' ? minVariantPrice : 0
        const landed = Math.max(0, baseCostSar) + Math.max(0, shippingSar)
        let retail = computeRetailFromLanded(landed, { margin: policy.margin, roundTo: policy.roundTo, prettyEnding: policy.endings })
        if (retail < policy.floorSar) retail = policy.floorSar
        await admin.from('products').update({ price: retail }).eq('id', productId)
        updated.push('price')
      } catch {}
    }

    // Variants table
    if (await productVariantsTableExists()) {
      const rows = (cj.variants || [])
        .filter((v) => v && (v.size || v.cjSku))
        .map((v) => ({
          product_id: productId,
          option_name: 'Size',
          option_value: v.size || '-',
          cj_sku: v.cjSku || null,
          price: typeof v.price === 'number' ? v.price : null,
          stock: typeof v.stock === 'number' ? v.stock : 0,
        }))
      await admin.from('product_variants').delete().eq('product_id', productId)
      if (rows.length > 0) await admin.from('product_variants').insert(rows)
      updated.push('variants')
    }

    try { await admin.rpc('recompute_product_stock', { product_id_in: productId }) } catch {}

    return { ok: true, productId, updated }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'upsert failed' }
  }
}

export async function persistRawCj(productId: number, raw: any): Promise<void> {
  const admin = getSupabaseAdmin()
  if (!admin) return
  if (!(await hasTable('raw_cj_responses'))) return
  try {
    await admin.from('raw_cj_responses').insert({ product_id: productId, source: 'cj', payload: raw })
  } catch {}
}

export async function logSync(event: string, meta: Record<string, any>) {
  const admin = getSupabaseAdmin()
  if (!admin) return
  if (!(await hasTable('sync_logs'))) return
  try {
    await admin.from('sync_logs').insert({ event, meta })
  } catch {}
}
