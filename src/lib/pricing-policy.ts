import { createClient } from '@supabase/supabase-js'
import { hasTable } from '@/lib/db-features'
import { getEnv } from '@/lib/env'

export type PricingPolicy = {
  margin: number // 0..1 (e.g., 0.35)
  floorSar: number // minimum retail SAR
  roundTo: number // rounding step (e.g., 0.05)
  endings: number[] // preferred decimal endings (e.g., [0.95, 0.99])
}

function getSupabaseAdmin() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL') as string | undefined
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') as string | undefined
  if (!url || !key) return null
  return createClient(url, key)
}

function defaultsFromEnv(): PricingPolicy {
  const margin = Number(process.env.PRICE_MARGIN_DEFAULT || '0.35')
  const floorSar = Number(process.env.PRICE_FLOOR_SAR || '9')
  const roundTo = Number(process.env.PRICE_ROUND_STEP || '0.05')
  const endingsCsv = (process.env.PRICE_ENDINGS || '0.95,0.99').split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n))
  const endings = endingsCsv.length > 0 ? endingsCsv : [0.95, 0.99]
  return { margin: Math.max(0, Math.min(0.95, margin || 0.35)), floorSar: Math.max(0, floorSar || 0), roundTo: roundTo || 0.05, endings }
}

export async function loadPricingPolicy(collection?: string): Promise<PricingPolicy> {
  const admin = getSupabaseAdmin()
  const d = defaultsFromEnv()
  if (!admin) return d
  try {
    if (!(await hasTable('pricing_policies'))) return d
    const q = admin.from('pricing_policies').select('*').limit(1)
    if (collection) q.eq('collection', collection)
    const { data } = await q
    if (!data || data.length === 0) return d
    const row = data[0] as any
    const endings: number[] = Array.isArray(row.endings) ? row.endings : (typeof row.endings === 'string' ? row.endings.split(',').map((s: string) => Number(s.trim())).filter((n: number) => Number.isFinite(n)) : d.endings)
    return {
      margin: Number(row.margin ?? d.margin) || d.margin,
      floorSar: Number(row.floor_sar ?? d.floorSar) || d.floorSar,
      roundTo: Number(row.round_to ?? d.roundTo) || d.roundTo,
      endings: endings.length > 0 ? endings : d.endings,
    }
  } catch {
    return d
  }
}
