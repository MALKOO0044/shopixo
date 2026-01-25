/*
  One-off importer to add a single product from CJ into Supabase.
  Usage examples:
    node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/cj/import-one.ts --keyword "women dress"
    node -r ts-node/register/transpile-only -r tsconfig-paths/register scripts/cj/import-one.ts --pid <CJ_PID>

  Required env:
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    CJ_API_BASE (optional)
    CJ_ACCESS_TOKEN or (CJ_EMAIL + CJ_API_KEY)
*/

import { createClient } from '@supabase/supabase-js'
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '../../src/lib/cj/v2'
import { upsertProductFromCj, persistRawCj } from '../../src/lib/ops/cj-sync'

function getArg(name: string): string | undefined {
  const idx = process.argv.findIndex(a => a === `--${name}`)
  if (idx >= 0) return process.argv[idx + 1]
  const pref = `--${name}=`
  const found = process.argv.find(a => a.startsWith(pref))
  if (found) return found.slice(pref.length)
  return undefined
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

async function main() {
  const pid = getArg('pid')
  const keyword = getArg('keyword') || (pid ? undefined : 'women dress')
  const admin = getSupabaseAdmin()

  console.log('Importing one product from CJ...', { pid, keyword })

  const raw = await queryProductByPidOrKeyword({ pid: pid || undefined, keyword })
  const list: any[] = Array.isArray(raw?.data?.content)
    ? raw.data.content
    : Array.isArray(raw?.data?.list)
      ? raw.data.list
      : Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(raw?.data)
          ? raw.data
          : []

  if (!list || list.length === 0) {
    throw new Error('No CJ items found for provided pid/keyword')
  }

  const itemRaw = list[0]
  const mapped = mapCjItemToProductLike(itemRaw)
  if (!mapped) throw new Error('Mapping failed for selected CJ item')

  const up = await upsertProductFromCj(mapped, { updateImages: true, updateVideo: true, updatePrice: true })
  if (!('ok' in up) || !up.ok) throw new Error((up as any).error || 'Upsert failed')

  try { await persistRawCj(up.productId, itemRaw) } catch {}

  let slug: string | undefined
  try {
    const { data } = await admin.from('products').select('slug').eq('id', up.productId).maybeSingle()
    slug = data?.slug || undefined
  } catch {}

  console.log('Import complete', { productId: up.productId, slug, updated: up.updated })
  if (slug) {
    console.log(`PDP URL: /product/${slug}`)
  }
}

main().catch((e) => {
  console.error('Import failed:', e?.message || e)
  process.exitCode = 1
})
