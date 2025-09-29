import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/cj/v2';

function getBase(): string {
  const b = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
  return b.replace(/\/$/, '');
}

export async function GET(req: Request) {
  const out: any = { ok: false };
  try {
    const { searchParams } = new URL(req.url);
    const testPid = searchParams.get('pid') || undefined;
    const kw = searchParams.get('kw') || 'dress';

    // 1) Token
    try {
      const token = await getAccessToken();
      out.tokenObtained = true;
      out.tokenPreview = token ? token.slice(0, 6) + '...' + token.slice(-6) : null;
    } catch (e: any) {
      out.tokenObtained = false;
      out.tokenError = e?.message || String(e);
    }

    // If no token, stop early
    if (!out.tokenObtained) {
      return NextResponse.json({ ok: false, step: 'token', ...out }, { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'CJ-Access-Token': out.tokenPreview ? undefined as any : undefined,
    } as any;
    // We'll use the real token; mask only in output
    const tokenFull = out.tokenPreview ? undefined : undefined; // not used

    // Fetch helper preserving status/text
    async function probe(path: string) {
      const url = `${getBase()}${path.startsWith('/') ? '' : '/'}${path}`;
      const res = await fetch(url, { method: 'GET', headers: { 'CJ-Access-Token': await getAccessToken() } });
      const text = await res.text();
      let body: any = null;
      try { body = JSON.parse(text); } catch { body = text; }
      return { status: res.status, ok: res.ok, body };
    }

    out.tests = {};
    out.tests.productList = await probe(`/product/list?keyWords=${encodeURIComponent(kw)}&pageSize=1&pageNum=1`);
    out.tests.queryKeyword = await probe(`/product/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`);
    out.tests.myProductKeyword = await probe(`/product/myProduct/query?keyword=${encodeURIComponent(kw)}&pageSize=1&pageNumber=1`);
    if (testPid) out.tests.queryPid = await probe(`/product/query?pid=${encodeURIComponent(testPid)}`);

    out.ok = true;
    return NextResponse.json(out);
  } catch (e: any) {
    out.ok = false;
    out.error = e?.message || String(e);
    return NextResponse.json(out, { status: 500 });
  }
}
