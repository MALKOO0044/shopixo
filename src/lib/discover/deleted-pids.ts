import { createClient } from '@supabase/supabase-js'
import { hasTable } from '@/lib/db-features'
import { normalizeCjProductId } from '@/lib/import/normalization'
import { getSetting, setSetting } from '@/lib/settings'

export const DISCOVER_DELETED_PIDS_KEY = 'discover_deleted_pids'

const DISCOVER_DELETED_PRODUCTS_TABLE = 'discover_deleted_products'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function normalizePidList(value: unknown): string[] {
  const out = new Set<string>()

  const push = (raw: unknown) => {
    const pid = normalizeCjProductId(raw)
    if (pid) out.add(pid)
  }

  if (Array.isArray(value)) {
    for (const entry of value) push(entry)
  } else if (value !== undefined && value !== null) {
    push(value)
  }

  return Array.from(out)
}

function mergeUnique(base: string[], extra: string[]): string[] {
  if (base.length === 0) return Array.from(new Set(extra))
  if (extra.length === 0) return Array.from(new Set(base))
  return Array.from(new Set([...base, ...extra]))
}

function chunkArray<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < values.length; i += chunkSize) {
    chunks.push(values.slice(i, i + chunkSize))
  }
  return chunks
}

async function readDeletedPidsFromTable(): Promise<{ pids: string[]; tableExists: boolean; error?: string }> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return { pids: [], tableExists: false }
  }

  const tableExists = await hasTable(DISCOVER_DELETED_PRODUCTS_TABLE)
  if (!tableExists) {
    return { pids: [], tableExists: false }
  }

  const { data, error } = await admin
    .from(DISCOVER_DELETED_PRODUCTS_TABLE)
    .select('pid')

  if (error) {
    return { pids: [], tableExists: true, error: error.message }
  }

  const pids = normalizePidList((data || []).map((row: any) => row?.pid))
  return { pids, tableExists: true }
}

async function upsertDeletedPidsToTable(
  pids: string[],
  meta?: { deletedBy?: string | null; reason?: string | null }
): Promise<{ ok: boolean; tableExists: boolean; error?: string }> {
  const normalizedPids = normalizePidList(pids)
  if (normalizedPids.length === 0) return { ok: true, tableExists: false }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return { ok: false, tableExists: false, error: 'Supabase admin client missing' }
  }

  const tableExists = await hasTable(DISCOVER_DELETED_PRODUCTS_TABLE)
  if (!tableExists) {
    return { ok: false, tableExists: false, error: 'discover_deleted_products table missing' }
  }

  const nowIso = new Date().toISOString()
  const rows = normalizedPids.map((pid) => ({
    pid,
    deleted_at: nowIso,
    deleted_by: meta?.deletedBy || null,
    reason: meta?.reason || null,
    updated_at: nowIso,
  }))

  for (const chunk of chunkArray(rows, 300)) {
    const { error } = await admin
      .from(DISCOVER_DELETED_PRODUCTS_TABLE)
      .upsert(chunk, { onConflict: 'pid' })

    if (error) {
      return { ok: false, tableExists: true, error: error.message }
    }
  }

  return { ok: true, tableExists: true }
}

async function deleteDeletedPidsFromTable(pids: string[]): Promise<{ ok: boolean; tableExists: boolean; error?: string }> {
  const normalizedPids = normalizePidList(pids)
  if (normalizedPids.length === 0) return { ok: true, tableExists: false }

  const admin = getSupabaseAdmin()
  if (!admin) {
    return { ok: false, tableExists: false, error: 'Supabase admin client missing' }
  }

  const tableExists = await hasTable(DISCOVER_DELETED_PRODUCTS_TABLE)
  if (!tableExists) {
    return { ok: false, tableExists: false, error: 'discover_deleted_products table missing' }
  }

  for (const chunk of chunkArray(normalizedPids, 400)) {
    const { error } = await admin
      .from(DISCOVER_DELETED_PRODUCTS_TABLE)
      .delete()
      .in('pid', chunk)

    if (error) {
      return { ok: false, tableExists: true, error: error.message }
    }
  }

  return { ok: true, tableExists: true }
}

async function readDeletedPidsFromSettings(): Promise<string[]> {
  const legacy = await getSetting<unknown>(DISCOVER_DELETED_PIDS_KEY, [])
  return normalizePidList(legacy)
}

export async function backfillDiscoverDeletedPidsTableFromLegacy(): Promise<{ ok: boolean; error?: string }> {
  const legacyPids = await readDeletedPidsFromSettings()
  if (legacyPids.length === 0) return { ok: true }

  const upsertResult = await upsertDeletedPidsToTable(legacyPids)
  if (!upsertResult.ok && upsertResult.tableExists) {
    return { ok: false, error: upsertResult.error || 'Failed to backfill discover deleted table' }
  }

  return { ok: true }
}

export async function loadDiscoverDeletedPids(options?: {
  extraPids?: unknown
  includeLegacyPids?: boolean
}): Promise<string[]> {
  const out = new Set<string>()

  const tableRead = await readDeletedPidsFromTable()
  for (const pid of tableRead.pids) out.add(pid)

  const shouldReadLegacy =
    Boolean(options?.includeLegacyPids) ||
    !tableRead.tableExists ||
    Boolean(tableRead.error)

  if (shouldReadLegacy) {
    const legacyPids = await readDeletedPidsFromSettings()
    for (const pid of legacyPids) out.add(pid)

    if (tableRead.tableExists && tableRead.pids.length === 0 && legacyPids.length > 0) {
      // Best-effort auto-backfill to move reads off legacy settings over time.
      await upsertDeletedPidsToTable(legacyPids)
    }
  }

  const extra = normalizePidList(options?.extraPids)
  for (const pid of extra) out.add(pid)

  return Array.from(out)
}

export async function addDiscoverDeletedPids(
  pidsInput: unknown,
  meta?: { deletedBy?: string | null; reason?: string | null }
): Promise<{ ok: boolean; deletedPids: string[]; added: number; count: number; error?: string }> {
  const incoming = normalizePidList(pidsInput)
  if (incoming.length === 0) {
    return {
      ok: false,
      deletedPids: [],
      added: 0,
      count: 0,
      error: 'No valid pid provided',
    }
  }

  const current = await loadDiscoverDeletedPids({ includeLegacyPids: true })
  const merged = mergeUnique(current, incoming)

  const tableWrite = await upsertDeletedPidsToTable(incoming, meta)
  const legacyWrite = await setSetting(DISCOVER_DELETED_PIDS_KEY, merged)

  if (!tableWrite.ok && !legacyWrite.ok) {
    return {
      ok: false,
      deletedPids: current,
      added: 0,
      count: current.length,
      error: tableWrite.error || 'Failed to persist deleted products',
    }
  }

  return {
    ok: true,
    deletedPids: merged,
    added: Math.max(0, merged.length - current.length),
    count: merged.length,
  }
}

export async function removeDiscoverDeletedPids(
  pidsInput: unknown
): Promise<{ ok: boolean; deletedPids: string[]; removed: number; count: number; error?: string }> {
  const toRemove = normalizePidList(pidsInput)
  if (toRemove.length === 0) {
    return {
      ok: false,
      deletedPids: [],
      removed: 0,
      count: 0,
      error: 'No valid pid provided',
    }
  }

  const current = await loadDiscoverDeletedPids({ includeLegacyPids: true })
  const removeSet = new Set(toRemove)
  const next = current.filter((pid) => !removeSet.has(pid))

  const tableDelete = await deleteDeletedPidsFromTable(toRemove)
  const legacyWrite = await setSetting(DISCOVER_DELETED_PIDS_KEY, next)

  if (!tableDelete.ok && !legacyWrite.ok) {
    return {
      ok: false,
      deletedPids: current,
      removed: 0,
      count: current.length,
      error: tableDelete.error || 'Failed to update deleted products',
    }
  }

  return {
    ok: true,
    deletedPids: next,
    removed: Math.max(0, current.length - next.length),
    count: next.length,
  }
}
