import { z } from 'zod'

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  CJ_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  ADMIN_EMAILS: z.string().optional(),
  ADMIN_EMAIL_DOMAINS: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  AI_MODEL_TEXT: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

export const env: Env = EnvSchema.parse(process.env as any)

export function ensureEnv<K extends keyof Env>(keys: K[]): { ok: boolean; missing: K[] } {
  const missing = keys.filter((k) => !env[k])
  return { ok: missing.length === 0, missing }
}

export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return env[key]
}

export function parseCommaList(v?: string | null): string[] {
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export const adminEmailList = () => parseCommaList(env.ADMIN_EMAILS)
export const adminDomainList = () => parseCommaList(env.ADMIN_EMAIL_DOMAINS).map(d => d.replace(/^@/, ''))
