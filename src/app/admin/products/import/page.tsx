"use client";

import React, { useState } from 'react';

function parseCsv(text: string) {
  const rows = text.trim().split(/\r?\n/);
  const header = rows.shift()?.split(',') || [];
  const out: any[] = [];
  for (const line of rows) {
    if (!line.trim()) continue;
    const cols = line.split(',');
    const obj: any = {};
    header.forEach((h, i) => { obj[h.trim()] = (cols[i] || '').trim(); });
    out.push(obj);
  }
  return out;
}

export default function ImportProductsPage() {
  const [csv, setCsv] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [serverPreview, setServerPreview] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string>("");
  const [draftOnAnomalies, setDraftOnAnomalies] = useState(true);
  // CJ tab state
  const [cjKeyword, setCjKeyword] = useState("");
  const [cjPid, setCjPid] = useState("");
  const [cjUrl, setCjUrl] = useState("");
  const [cjLoading, setCjLoading] = useState(false);
  const [cjResults, setCjResults] = useState<any[] | null>(null);
  const [cjMessage, setCjMessage] = useState<string>("");

  function mapRowsToPayload(rows: any[]) {
    return rows.map((r) => ({
      name: r.Name || r.title || r.TITLE || 'Untitled',
      supplierCost: Number(r.UnitCost || r.supplierCost || 0),
      currency: (r.UnitCostCurrency || 'SAR').toUpperCase(),
      lengthCm: Number(r.PackLengthCM || r.length || 25),
      widthCm: Number(r.PackWidthCM || r.width || 20),
      heightCm: Number(r.PackHeightCM || r.height || 3),
      weightKg: Number(r.GrossWeightKG || r.weight || 0.4),
      imagesCsv: r.Images || r.images || '',
      videoUrl: r.VideoUrl || r.videoUrl || r.VIDEO || r.video || '',
      category: r.Category || r.category || 'General',
      stock: Number(r.Stock || r.stock || 100),
    }));
  }

  async function handlePreview() {
    const rows = parseCsv(csv);
    const payload = mapRowsToPayload(rows);
    setItems(payload);
    setServerPreview(null);
  }

  async function handleServerPreview() {
    try {
      setLoading(true);
      setLog('');
      const res = await fetch('/api/admin/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, preview: true, draftOnAnomalies }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || res.statusText);
      setServerPreview(data);
    } catch (e: any) {
      setLog(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    try {
      setLoading(true);
      setLog('');
      const res = await fetch('/api/admin/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, draftOnAnomalies }),
      });
      const data = await res.json();
      setLog(JSON.stringify(data, null, 2));
      if (res.ok) setServerPreview(null);
    } catch (e: any) {
      setLog(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  // --- CJ Tab handlers ---
  async function handleCjSearch() {
    try {
      setCjLoading(true);
      setCjMessage('');
      setCjResults(null);
      const url = new URL('/api/admin/cj/products/query', window.location.origin);
      if (cjPid.trim()) url.searchParams.set('pid', cjPid.trim());
      if (cjKeyword.trim()) url.searchParams.set('keyword', cjKeyword.trim());
      if (cjUrl.trim()) url.searchParams.set('url', cjUrl.trim());
      const res = await fetch(url.toString(), { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || res.statusText);
      setCjResults(data.items || []);
      if ((data.items || []).length === 0) setCjMessage('لم يتم العثور على منتجات.');
    } catch (e: any) {
      setCjMessage(e?.message || 'فشل البحث في CJ. تأكد من إعداد CJ_ACCESS_TOKEN.');
    } finally {
      setCjLoading(false);
    }
  }

  async function handleCjImportOne(idx: number) {
    if (!cjResults || !cjResults[idx]) return;
    try {
      setCjLoading(true);
      setCjMessage('');
      const body = { items: [cjResults[idx]] };
      const res = await fetch('/api/admin/cj/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || res.statusText);
      setCjMessage('تم الاستيراد بنجاح.');
    } catch (e: any) {
      setCjMessage(e?.message || 'فشل الاستيراد.');
    } finally {
      setCjLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">CSV Import — Products</h1>
      <p className="text-sm opacity-80">Paste CSV matching branding/suppliers/sku-specs-template.csv. Columns like: Name, UnitCostCurrency, UnitCost, PackLengthCM, PackWidthCM, PackHeightCM, GrossWeightKG, Images, Category, Stock.</p>

      <textarea
        className="w-full h-48 border rounded p-2 font-mono"
        placeholder="Paste CSV here"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <button onClick={handlePreview} className="px-4 py-2 bg-gray-800 text-white rounded">Preview</button>
        <button onClick={handleServerPreview} disabled={loading || items.length === 0} className="px-4 py-2 bg-amber-600 text-white rounded disabled:opacity-50">{loading ? 'Processing…' : 'Server Preview (AI + Pricing)'}</button>
        <button onClick={handleImport} disabled={loading || items.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{loading ? 'Importing…' : `Import ${items.length} Products`}</button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draftOnAnomalies} onChange={(e) => setDraftOnAnomalies(e.target.checked)} />
          <span>Mark anomalies as draft</span>
        </label>
      </div>

      {items.length > 0 && (
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Currency</th>
                <th className="p-2 text-right">Cost</th>
                <th className="p-2 text-right">L×W×H (cm)</th>
                <th className="p-2 text-right">Weight (kg)</th>
                <th className="p-2 text-left">Images</th>
                <th className="p-2 text-left">Video</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2">{it.currency}</td>
                  <td className="p-2 text-right">{it.supplierCost}</td>
                  <td className="p-2 text-right">{it.lengthCm}×{it.widthCm}×{it.heightCm}</td>
                  <td className="p-2 text-right">{it.weightKg}</td>
                  <td className="p-2 truncate max-w-[240px]" title={it.imagesCsv}>{it.imagesCsv || <span className="opacity-60">(missing)</span>}</td>
                  <td className="p-2 truncate max-w-[200px]" title={it.videoUrl}>{it.videoUrl ? 'yes' : <span className="opacity-60">(none)</span>}</td>
                  <td className="p-2">{it.category}</td>
                  <td className="p-2 text-right">{it.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {serverPreview && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Server Preview Results</h2>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Slug</th>
                  <th className="p-2 text-left">Category</th>
                  <th className="p-2 text-right">Retail (SAR)</th>
                  <th className="p-2 text-right">Landed (SAR)</th>
                  <th className="p-2 text-right">DDP Ship (SAR)</th>
                  <th className="p-2 text-right">Billed Wt (kg)</th>
                  <th className="p-2 text-right">Vol (kg)</th>
                  <th className="p-2 text-left">Anomalies</th>
                </tr>
              </thead>
              <tbody>
                {serverPreview.results?.map((r: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{r.title}</td>
                    <td className="p-2">{r.slug}</td>
                    <td className="p-2">{r.category}</td>
                    <td className="p-2 text-right">{r.pricing?.retailSar}</td>
                    <td className="p-2 text-right">{r.pricing?.landedCostSar}</td>
                    <td className="p-2 text-right">{r.pricing?.ddpShippingSar}</td>
                    <td className="p-2 text-right">{r.pricing?.billedWeightKg}</td>
                    <td className="p-2 text-right">{r.volumetricKg}</td>
                    <td className="p-2">
                      {Array.isArray(r.anomalies) && r.anomalies.length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-0.5">
                          {r.anomalies.map((a: any, i: number) => (
                            <li key={i} className={a.severity === 'warn' ? 'text-amber-700' : a.severity === 'error' ? 'text-red-700' : 'text-slate-600'}>
                              {a.code}: {a.message}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs opacity-60">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer">Raw preview JSON</summary>
            <pre className="bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-80">{JSON.stringify(serverPreview, null, 2)}</pre>
          </details>
        </div>
      )}

      {/* CJ Import Section */}
      <div className="mt-10 border-t pt-6 space-y-4">
        <h2 className="text-xl font-semibold">CJ Import</h2>
        <p className="text-sm opacity-80">ابحث بالـ PID أو كلمة مفتاحية أو الصق رابط منتج CJ، ثم استورد المنتج (يشمل الصور/الفيديو/المقاسات/المخزون). يحتاج تفعيل CJ_EMAIL و CJ_API_KEY في Vercel.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input className="border rounded p-2 flex-1" placeholder="PID" value={cjPid} onChange={(e) => setCjPid(e.target.value)} />
          <input className="border rounded p-2 flex-1" placeholder="Keyword" value={cjKeyword} onChange={(e) => setCjKeyword(e.target.value)} />
          <input className="border rounded p-2 flex-1" placeholder="CJ Product URL" value={cjUrl} onChange={(e) => setCjUrl(e.target.value)} />
          <button onClick={handleCjSearch} disabled={cjLoading} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50">{cjLoading ? 'جارٍ البحث…' : 'Search CJ'}</button>
        </div>
        {cjMessage && <div className="text-sm text-slate-600">{cjMessage}</div>}
        {Array.isArray(cjResults) && cjResults.length > 0 && (
          <div className="space-y-4">
            {cjResults.map((p, idx) => (
              <div key={idx} className="rounded border p-3">
                <div className="flex items-start gap-3">
                  <div className="grid grid-cols-4 gap-2 w-1/2 pr-2">
                    {(p.images || []).slice(0, 8).map((u: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={u} alt="" className="aspect-square w-full object-cover rounded bg-slate-100" />
                    ))}
                    {p.videoUrl ? (
                      <div className="col-span-4 text-xs text-emerald-700">Video: نعم</div>
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">PID: {p.productId} · From: {p.originArea || '—'} ({p.originCountryCode || '—'})</div>
                    <div className="overflow-auto mt-2">
                      <table className="min-w-[360px] text-xs">
                        <thead>
                          <tr className="bg-muted">
                            <th className="p-1 text-left">Size</th>
                            <th className="p-1 text-right">Price</th>
                            <th className="p-1 text-right">Stock</th>
                            <th className="p-1 text-left">SKU</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(p.variants || []).map((v: any, vi: number) => (
                            <tr key={vi} className="border-t">
                              <td className="p-1">{v.size || '-'}</td>
                              <td className="p-1 text-right">{v.price ?? '—'}</td>
                              <td className="p-1 text-right">{v.stock ?? '—'}</td>
                              <td className="p-1">{v.cjSku || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2">
                      <button onClick={() => handleCjImportOne(idx)} disabled={cjLoading} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{cjLoading ? 'جارٍ الاستيراد…' : 'Import'}</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {log && (
        <pre className="bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-80">{log}</pre>
      )}
    </div>
  );
}
