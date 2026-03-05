import { NextResponse } from 'next/server';
import { fetchProductListPage } from '@/lib/cj/v2';
import { ensureAdmin } from '@/lib/auth/admin-guard';
import {
  diffCounterSnapshots,
  getRequestCountersSnapshot,
  withRequestCounters,
} from '@/lib/telemetry/request-counters';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return withRequestCounters(async () => {
    const requestCounterBefore = getRequestCountersSnapshot();
    const withCallbackTelemetry = <T extends Record<string, any>>(payload: T) => ({
      ...payload,
      cjApiCallbacks: diffCounterSnapshots(requestCounterBefore, getRequestCountersSnapshot()),
    });

    try {
      const guard = await ensureAdmin();
      if (!guard.ok) {
        return NextResponse.json(withCallbackTelemetry({ ok: false, error: guard.reason }), { status: 401 });
      }

      const { searchParams } = new URL(req.url);
      const categoryId = searchParams.get('categoryId') || '';
      const pageNum = Math.max(1, Number(searchParams.get('pageNum') || 1));
      const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 20)));

      const params = new URLSearchParams();
      params.set('pageNum', String(pageNum));
      params.set('pageSize', String(pageSize));
      if (categoryId) {
        params.set('categoryId', categoryId);
      }

      const requestPath = `/product/list?${params.toString()}`;
      console.log('[TestSearch] Calling path via CJ v2 helper:', requestPath);

      const page = await fetchProductListPage({
        pageNum,
        pageSize,
        categoryId: categoryId || undefined,
      });

      console.log('[TestSearch] Total products:', page.total);
      console.log('[TestSearch] List length:', page.list.length);

      if (page.list.length > 0) {
        const sample = page.list[0];
        console.log('[TestSearch] Sample product:', {
          pid: sample?.pid,
          name: sample?.productNameEn?.slice(0, 50),
          price: sample?.sellPrice,
          stock: sample?.stock,
          categoryId: sample?.categoryId,
          categoryName: sample?.categoryName,
          listedNum: sample?.listedNum,
        });
      }

      return NextResponse.json(withCallbackTelemetry({
        ok: true,
        requestPath,
        apiResponse: {
          code: 200,
          result: true,
          message: 'ok',
          total: page.total,
          pageSize,
          listLength: page.list.length,
          sampleProducts: page.list.slice(0, 3).map((p: any) => ({
            pid: p?.pid,
            name: p?.productNameEn,
            price: p?.sellPrice,
            stock: p?.stock,
            categoryId: p?.categoryId,
            categoryName: p?.categoryName,
            listedNum: p?.listedNum,
          })),
        },
      }));
    } catch (e: any) {
      console.error('[TestSearch] Error:', e?.message, e?.stack);
      return NextResponse.json(withCallbackTelemetry({ ok: false, error: e?.message }));
    }
  });
}
