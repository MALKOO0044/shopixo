import { NextResponse } from 'next/server';
import { queryProductByPidOrKeyword, mapCjItemToProductLike } from '@/lib/cj/v2';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pid = searchParams.get('pid') || undefined;
    const keyword = searchParams.get('keyword') || undefined;

    if (!pid && !keyword) {
      return NextResponse.json({ ok: false, error: 'Provide pid or keyword' }, { status: 400 });
    }

    const raw = await queryProductByPidOrKeyword({ pid, keyword });

    // Try to normalize CJ response to array of items
    const itemsRaw = Array.isArray(raw?.data?.content)
      ? raw.data.content
      : Array.isArray(raw?.content)
        ? raw.content
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw)
            ? raw
            : [];

    const items = (itemsRaw as any[])
      .map((it) => mapCjItemToProductLike(it))
      .filter(Boolean);

    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'CJ query failed' }, { status: 500 });
  }
}
