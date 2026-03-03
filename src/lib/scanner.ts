import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { queryProductByPidOrKeyword } from '@/lib/cj/v2'
import { saveNotification } from '@/lib/notify'

function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function runScannerJob(jobId: number): Promise<{ watched: number; updated: number; notifications: number }> {
  const db = getAdmin()
  if (!db) return { watched: 0, updated: 0, notifications: 0 }

  // Load watch list (cap to 100 per run)
  const { data: watch } = await db.from('cj_inventory_watch').select('*').order('created_at', { ascending: true }).limit(100)
  const watches = watch || []

  // Also include CJ PIDs from your catalog (limited)
  const { data: prod } = await db.from('products').select('id, cj_product_id').not('cj_product_id', 'is', null).order('id', { ascending: true }).limit(100)
  const extraPids = new Set<string>((prod || []).map(p => String(p.cj_product_id)))
  for (const w of watches) extraPids.add(String(w.cj_product_id))

  let updated = 0
  let notes = 0

  for (const pid of Array.from(extraPids)) {
    try {
      const raw = await queryProductByPidOrKeyword({ pid })
      const item = Array.isArray((raw as any)?.data?.content) ? (raw as any).data.content[0] : ((raw as any).data || raw)
      const variants: any[] = Array.isArray((item as any)?.variantList) ? (item as any).variantList : (Array.isArray((item as any)?.skuList) ? (item as any).skuList : [])

      // Build snapshot rows 
      const rows = [] as Array<{ cj_product_id: string; cj_sku: string | null; price: number | null; currency: string | null; stock: number | null; warehouse: string | null }>
      for (const v of variants) {
        const sku = String(v.cjSku || v.sku || v.skuId || v.barcode || '') || null
        const price = typeof v.price === 'number' ? v.price : (typeof v.sellPrice === 'number' ? v.sellPrice : null)
        const stock = typeof v.stock === 'number' ? v.stock : (typeof v.availableStock === 'number' ? v.availableStock : null)
        const wh = (v.warehouse || v.warehouseName || v.areaName || null) as string | null
        rows.push({ cj_product_id: pid, cj_sku: sku, price, currency: (v.currency || 'USD') as string, stock, warehouse: wh })
      }

      // Insert snapshots
      if (rows.length > 0) {
        const payload = rows.map(r => ({ cj_product_id: r.cj_product_id, cj_sku: r.cj_sku, price: r.price, currency: r.currency, stock: r.stock, warehouse: r.warehouse }))
        await db.from('inventory_snapshots').insert(payload as any)
      }

      // Update product_variants stock by cj_sku when possible
      if (rows.length > 0) {
        for (const r of rows) {
          if (!r.cj_sku || typeof r.stock !== 'number') continue
          try { await db.from('product_variants').update({ stock: Math.max(0, r.stock) }).eq('cj_sku', r.cj_sku as any) } catch {}
        }
      }

      // Evaluate watches for this pid
      const watchRows = (watches || []).filter(w => String(w.cj_product_id) === pid)
      for (const w of watchRows) {
        const lastSeen = (w.last_seen || {}) as any
        // price change detection (use first variant if sku not specified)
        const match = rows.find(r => (w.cj_sku ? r.cj_sku === w.cj_sku : true)) || rows[0]
        if (!match) continue
        let bumped = false

        if (w.watch_stock && typeof match.stock === 'number' && typeof w.threshold_low === 'number') {
          if (match.stock <= Math.max(0, w.threshold_low)) {
            await saveNotification({ type: 'stock_low', title: `Low stock for ${pid}${w.cj_sku ? ' / '+w.cj_sku : ''}`, body: `Stock: ${match.stock} ≤ threshold ${w.threshold_low}`, meta: { pid, sku: w.cj_sku, stock: match.stock } })
            notes++
            bumped = true
          }
        }
        if (w.watch_price && typeof match.price === 'number') {
          const prev = typeof lastSeen.price === 'number' ? lastSeen.price : null
          const pct = typeof w.price_change_threshold === 'number' ? w.price_change_threshold : 5
          if (prev !== null && prev > 0) {
            const delta = ((match.price - prev) / prev) * 100
            if (Math.abs(delta) >= pct) {
              await saveNotification({ type: 'price_change', title: `Price change for ${pid}${w.cj_sku ? ' / '+w.cj_sku : ''}`, body: `Δ ${delta.toFixed(2)}% (${prev}→${match.price})`, meta: { pid, sku: w.cj_sku, prev, next: match.price, delta } })
              notes++
              bumped = true
            }
          }
        }
        // Update last_seen snapshot
        const nextSeen = { price: match.price ?? null, stock: match.stock ?? null, ts: new Date().toISOString() }
        try { await db.from('cj_inventory_watch').update({ last_seen: nextSeen }).eq('id', w.id) } catch {}
        if (bumped) updated++
      }
    } catch {
      // continue
    }
  }

  return { watched: watches.length, updated, notifications: notes }
}
