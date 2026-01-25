import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { loggerForRequest } from '@/lib/log'
import { hasColumn, hasTable } from '@/lib/db-features'
import { createClient } from '@supabase/supabase-js'
import { isKillSwitchOn } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function tokenOk(req: Request, envKey: string): boolean {
  try {
    const url = new URL(req.url)
    const qp = url.searchParams.get('token') || ''
    const hdr = req.headers.get('x-purge-token') || ''
    const auth = req.headers.get('authorization') || ''
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
    const provided = qp || hdr || bearer
    const expected = process.env[envKey] || process.env.SEED_IMPORT_TOKEN || ''
    if (!expected) return false
    return !!provided && provided === expected
  } catch { return false }
}

async function allow(req: Request) {
  const admin = await ensureAdmin()
  if (admin.ok) return true
  if (tokenOk(req, 'PRUNE_TOKEN')) return true
  return false
}

export async function GET(req: Request) {
  const log = loggerForRequest(req)
  const admin = getAdmin()
  if (!admin) {
    const r = NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
  try {
    if (!(await allow(req))) {
      const r = NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Global kill-switch enforcement
    if (await isKillSwitchOn()) {
      const r = NextResponse.json({ ok: false, error: 'Kill switch is ON. Purge is disabled.' }, { status: 423 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    const u = new URL(req.url)
    const params = {
      scope: (u.searchParams.get('scope') || 'non_cj').toLowerCase(),
      ids: (u.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean),
      cjPids: (u.searchParams.get('cjPids') || '').split(',').map(s => s.trim()).filter(Boolean),
      hard: ((u.searchParams.get('hard') || 'false').toLowerCase() === 'true'),
      dry: ((u.searchParams.get('dryRun') || 'false').toLowerCase() === 'true'),
      confirm: u.searchParams.get('confirm') || ''
    }

    if (params.confirm !== 'PURGE') {
      const r = NextResponse.json({ ok: false, error: 'Confirmation required: add confirm=PURGE' }, { status: 400 })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    // Determine target product IDs
    let targetIds: number[] = []

    if (params.ids.length > 0) {
      const parsed = params.ids.map((s) => Number(s)).filter((n) => Number.isFinite(n))
      targetIds = parsed
    } else if (params.cjPids.length > 0) {
      const { data, error } = await admin
        .from('products')
        .select('id, cj_product_id')
        .in('cj_product_id', params.cjPids)
      if (error) throw error
      targetIds = (data || []).map((r: any) => r.id)
    } else if (params.scope === 'all') {
      const { data, error } = await admin
        .from('products')
        .select('id')
        .limit(10000)
      if (error) throw error
      targetIds = (data || []).map((r: any) => r.id)
    } else {
      // non_cj: cj_product_id is null
      const colExists = await hasColumn('products', 'cj_product_id')
      if (colExists) {
        const { data, error } = await admin
          .from('products')
          .select('id')
          .is('cj_product_id', null)
          .limit(10000)
        if (error) throw error
        targetIds = (data || []).map((r: any) => r.id)
      } else {
        // If no cj_product_id column, nothing to purge under non_cj scope unless ids/cjPids provided
        targetIds = []
      }
    }

    // Unique list
    targetIds = Array.from(new Set(targetIds)).filter((n) => Number.isFinite(n))

    if (params.dry) {
      const r = NextResponse.json({ ok: true, dryRun: true, count: targetIds.length, ids: targetIds.slice(0, 200) })
      r.headers.set('x-request-id', log.requestId)
      return r
    }

    let updated = 0
    let deletedVariants = 0
    let deletedProducts = 0

    // Delete variants for the target products if table exists
    if (await hasTable('product_variants')) {
      if (targetIds.length > 0) {
        const { count, error } = await admin
          .from('product_variants')
          .delete({ count: 'exact' })
          .in('product_id', targetIds)
        if (error) throw error
        deletedVariants = count || 0
      }
    }

    // Soft archive by is_active if available and not hard delete
    const hasIsActive = await hasColumn('products', 'is_active')
    if (!params.hard && hasIsActive && targetIds.length > 0) {
      const { data: updRows, error } = await admin
        .from('products')
        .update({ is_active: false })
        .in('id', targetIds)
        .select('id')
      if (error) throw error
      updated = (updRows?.length || 0)
    }

    // Hard delete if requested
    if (params.hard && targetIds.length > 0) {
      const { count, error } = await admin
        .from('products')
        .delete({ count: 'exact' })
        .in('id', targetIds)
      if (error) throw error
      deletedProducts = count || 0
    }

    const r = NextResponse.json({ ok: true, scope: params.scope, hard: params.hard, affected: { productsSoftUpdated: updated, variantsDeleted: deletedVariants, productsDeleted: deletedProducts }, targetCount: targetIds.length })
    r.headers.set('x-request-id', log.requestId)
    return r
  } catch (e: any) {
    const r = NextResponse.json({ ok: false, error: e?.message || 'purge failed' }, { status: 500 })
    r.headers.set('x-request-id', log.requestId)
    return r
  }
}
