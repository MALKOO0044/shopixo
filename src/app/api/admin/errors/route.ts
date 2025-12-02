import { NextResponse } from 'next/server';
import { getRecentErrors, getErrorNotificationMode, setErrorNotificationMode } from '@/lib/error-logger';
import { ensureAdmin } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const adminCheck = await ensureAdmin();
  if (!adminCheck.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    
    const [errors, mode] = await Promise.all([
      getRecentErrors(limit),
      getErrorNotificationMode(),
    ]);
    
    return NextResponse.json({ 
      ok: true, 
      errors,
      notificationMode: mode,
    });
  } catch (e: any) {
    console.error('[Error API] Exception:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminCheck = await ensureAdmin();
  if (!adminCheck.ok) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { notificationMode } = body;
    
    if (notificationMode && (notificationMode === 'visible' || notificationMode === 'silent')) {
      const success = await setErrorNotificationMode(notificationMode);
      return NextResponse.json({ ok: success });
    }
    
    return NextResponse.json({ ok: false, error: 'Invalid mode' }, { status: 400 });
  } catch (e: any) {
    console.error('[Error API] Exception:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
