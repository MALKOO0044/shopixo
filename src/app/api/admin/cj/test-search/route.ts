import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const guard = await ensureAdmin();
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || '';
    const pageNum = Number(searchParams.get('pageNum') || 1);

    console.log('[TestSearch] Getting access token...');
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Failed to get access token' });
    }
    console.log('[TestSearch] Got token:', token.slice(0, 20) + '...');

    const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
    
    const params = new URLSearchParams();
    params.set('pageNum', String(pageNum));
    if (categoryId) {
      params.set('categoryId', categoryId);
    }
    
    const url = `${base}/product/list?${params}`;
    console.log('[TestSearch] Calling URL:', url);

    const response = await fetch(url, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    console.log('[TestSearch] Response code:', data.code, 'result:', data.result);
    console.log('[TestSearch] Message:', data.message);
    
    if (data.data) {
      console.log('[TestSearch] Total products:', data.data.total);
      console.log('[TestSearch] Page size:', data.data.pageSize);
      console.log('[TestSearch] List length:', data.data.list?.length);
      
      if (data.data.list && data.data.list.length > 0) {
        const sample = data.data.list[0];
        console.log('[TestSearch] Sample product:', {
          pid: sample.pid,
          name: sample.productNameEn?.slice(0, 50),
          price: sample.sellPrice,
          stock: sample.stock,
          categoryId: sample.categoryId,
          categoryName: sample.categoryName,
          listedNum: sample.listedNum,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      requestUrl: url,
      apiResponse: {
        code: data.code,
        result: data.result,
        message: data.message,
        total: data.data?.total,
        pageSize: data.data?.pageSize,
        listLength: data.data?.list?.length,
        sampleProducts: data.data?.list?.slice(0, 3).map((p: any) => ({
          pid: p.pid,
          name: p.productNameEn,
          price: p.sellPrice,
          stock: p.stock,
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          listedNum: p.listedNum,
        })),
      },
    });
  } catch (e: any) {
    console.error('[TestSearch] Error:', e?.message, e?.stack);
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
