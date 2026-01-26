import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/cj/v2';
import { fetchJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('categoryId') || '';
  const pageNum = searchParams.get('page') || '1';
  
  try {
    const token = await getAccessToken();
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Failed to get CJ access token' });
    }
    
    const base = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
    
    const params = new URLSearchParams();
    params.set('pageNum', pageNum);
    params.set('pageSize', '20');
    
    if (categoryId && categoryId !== 'all' && !categoryId.startsWith('first-') && !categoryId.startsWith('second-')) {
      params.set('categoryId', categoryId);
    }
    
    const url = `${base}/product/list?${params}`;
    console.log('[TEST] Fetching:', url);
    
    const res = await fetchJson<any>(url, {
      headers: {
        'CJ-Access-Token': token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 30000,
    });
    
    console.log('[TEST] Response code:', res?.code, 'result:', res?.result);
    console.log('[TEST] Data keys:', res?.data ? Object.keys(res.data) : 'no data');
    
    const list = res?.data?.list || [];
    const total = res?.data?.total || 0;
    
    console.log('[TEST] List length:', list.length, 'Total:', total);
    
    if (list.length > 0) {
      console.log('[TEST] Full first product keys:', Object.keys(list[0]));
      console.log('[TEST] Full first product:', JSON.stringify(list[0]).slice(0, 2000));
    }
    
    return NextResponse.json({
      ok: true,
      categoryIdUsed: categoryId || 'all',
      total,
      count: list.length,
      fullProductKeys: list.length > 0 ? Object.keys(list[0]) : [],
      fullFirstProduct: list.length > 0 ? list[0] : null,
      sample: list.slice(0, 5).map((p: any) => ({
        pid: p.pid,
        name: p.productNameEn?.slice(0, 60),
        price: p.sellPrice,
        stock: p.stock,
        listedNum: p.listedNum,
        categoryId: p.categoryId,
      })),
      rawResponse: {
        code: res?.code,
        result: res?.result,
        message: res?.message,
      }
    });
  } catch (e: any) {
    console.error('[TEST] Error:', e?.message);
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
