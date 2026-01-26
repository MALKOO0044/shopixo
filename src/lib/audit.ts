import { createClient } from '@supabase/supabase-js'
import { hasTable } from '@/lib/db-features'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type AuditEvent = {
  action: string
  entity?: string
  entityId?: string | number | null
  userEmail?: string | null
  userId?: string | null
  payload?: any
}

export async function recordAudit(evt: AuditEvent): Promise<boolean> {
  const admin = getSupabaseAdmin()
  if (!admin) return false
  if (!(await hasTable('audit_logs'))) return false
  try {
    const row = {
      action: String(evt.action || '').slice(0, 120),
      entity: evt.entity ? String(evt.entity).slice(0, 80) : null,
      entity_id: evt.entityId ?? null,
      user_email: evt.userEmail ?? null,
      user_id: evt.userId ?? null,
      payload: evt.payload ?? null,
      created_at: new Date().toISOString(),
    }
    await admin.from('audit_logs').insert(row)
    return true
  } catch {
    return false
  }
}
