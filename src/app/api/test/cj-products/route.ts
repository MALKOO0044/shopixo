import { NextResponse } from 'next/server';
import { fetchProductListPage } from '@/lib/cj/v2';
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

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || '';
    const pageNum = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 20)));

    const normalizedCategoryId =
      categoryId
      && categoryId !== 'all'
      && !categoryId.startsWith('first-')
      && !categoryId.startsWith('second-')
        ? categoryId
        : undefined;

    try {
      const page = await fetchProductListPage({
        pageNum,
        pageSize,
        categoryId: normalizedCategoryId,
      });
      const list = page.list || [];
      const total = page.total || 0;

      console.log('[TEST] List length:', list.length, 'Total:', total);

      if (list.length > 0) {
        console.log('[TEST] Full first product keys:', Object.keys(list[0]));
        console.log('[TEST] Full first product:', JSON.stringify(list[0]).slice(0, 2000));
      }

      return NextResponse.json(withCallbackTelemetry({
        ok: true,
        categoryIdUsed: categoryId || 'all',
        total,
        count: list.length,
        fullProductKeys: list.length > 0 ? Object.keys(list[0]) : [],
        fullFirstProduct: list.length > 0 ? list[0] : null,
        sample: list.slice(0, 5).map((p: any) => ({
          pid: p?.pid,
          name: p?.productNameEn?.slice(0, 60),
          price: p?.sellPrice,
          stock: p?.stock,
          listedNum: p?.listedNum,
          categoryId: p?.categoryId,
        })),
        rawResponse: {
          code: 200,
          result: true,
          message: 'ok',
        },
      }));
    } catch (e: any) {
      console.error('[TEST] Error:', e?.message);
      return NextResponse.json(withCallbackTelemetry({ ok: false, error: e?.message }));
    }
  });
}
