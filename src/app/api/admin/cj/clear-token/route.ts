import { NextResponse } from 'next/server';
import { clearTokenCache } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }
    
    clearTokenCache();
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Token cache cleared. Next CJ API call will authenticate with new credentials.' 
    });
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || 'Failed to clear token cache' 
    }, { status: 500 });
  }
}
