import { NextResponse } from 'next/server';
import { logError, ErrorType } from '@/lib/error-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { error_type, error_code, message, details, page } = body;
    
    if (!error_type || !message) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const result = await logError({
      error_type: error_type as ErrorType,
      error_code,
      message,
      details,
      page,
    });
    
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[Error Log API] Exception:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
