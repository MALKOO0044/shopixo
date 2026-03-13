import { getSetting } from '@/lib/settings'
import { normalizeCjProductId } from '@/lib/import/normalization'

const DISCOVER_DELETED_PIDS_KEY = 'discover_deleted_pids'
const LEGACY_DISCOVER_DELETED_PIDS_KEYS = ['finder_deleted_pids'] as const

type LoadDiscoverDeletedPidsOptions = {
  extraPids?: unknown
  includeLegacyPids?: boolean
}

function normalizePidList(value: unknown): string[] {
  const out = new Set<string>()

  const push = (rawPid: unknown) => {
    const normalizedPid = normalizeCjProductId(rawPid)
    if (normalizedPid) out.add(normalizedPid)
  }

  if (Array.isArray(value)) {
    for (const rawPid of value) push(rawPid)
  } else if (value !== undefined && value !== null) {
    push(value)
  }

  return Array.from(out)
}

export async function loadDiscoverDeletedPids(
  options: LoadDiscoverDeletedPidsOptions = {}
): Promise<string[]> {
  const out = new Set<string>()

  const merge = (source: unknown) => {
    for (const pid of normalizePidList(source)) out.add(pid)
  }

  merge(await getSetting<unknown>(DISCOVER_DELETED_PIDS_KEY, []))

  if (options.includeLegacyPids) {
    for (const key of LEGACY_DISCOVER_DELETED_PIDS_KEYS) {
      merge(await getSetting<unknown>(key, []))
    }
  }

  merge(options.extraPids)
  return Array.from(out)
}

export async function loadDiscoverDeletedPidSet(
  options: LoadDiscoverDeletedPidsOptions = {}
): Promise<Set<string>> {
  return new Set(await loadDiscoverDeletedPids(options))
}

export { DISCOVER_DELETED_PIDS_KEY }
