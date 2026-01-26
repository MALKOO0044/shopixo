import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  return NextResponse.json({
    ok: !!user && !error,
    user: user ? { id: user.id, email: user.email, provider: (user.app_metadata as any)?.provider } : null,
    error: error?.message || null,
  })
}
