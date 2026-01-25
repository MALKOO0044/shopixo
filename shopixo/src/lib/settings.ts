import { createClient } from '@supabase/supabase-js'
import { hasTable } from '@/lib/db-features'

export type OperatingMode = 'monitor' | 'copilot' | 'autopilot'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function hasSettingsTable(): Promise<boolean> {
  return await hasTable('kv_settings')
}

export async function getSetting<T = any>(key: string, fallback?: T): Promise<T | undefined> {
  const admin = getSupabaseAdmin()
  if (!admin) return fallback
  if (!(await hasTable('kv_settings'))) return fallback
  try {
    const { data } = await admin.from('kv_settings').select('value').eq('key', key).maybeSingle()
    if (data && typeof data.value !== 'undefined') return data.value as T
  } catch {}
  return fallback
}

export async function setSetting<T = any>(key: string, value: T): Promise<{ ok: boolean; tablesMissing?: boolean }> {
  const admin = getSupabaseAdmin()
  if (!admin) return { ok: false, tablesMissing: true }
  if (!(await hasTable('kv_settings'))) return { ok: false, tablesMissing: true }
  try {
    const row = { key, value, updated_at: new Date().toISOString() }
    await admin.from('kv_settings').upsert(row, { onConflict: 'key' })
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export async function getOperatingMode(): Promise<OperatingMode> {
  const v = await getSetting<OperatingMode>('operating_mode', 'monitor')
  return (v === 'copilot' || v === 'autopilot') ? v : 'monitor'
}

export async function setOperatingMode(mode: OperatingMode): Promise<boolean> {
  const result = await setSetting('operating_mode', mode)
  return result.ok
}

export async function isKillSwitchOn(): Promise<boolean> {
  const v = await getSetting<boolean>('kill_switch', false)
  return !!v
}

export async function setKillSwitch(on: boolean): Promise<boolean> {
  const result = await setSetting('kill_switch', !!on)
  return result.ok
}
