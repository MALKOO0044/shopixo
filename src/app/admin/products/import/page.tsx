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

      {log && (
        <pre className="bg-black text-green-300 text-xs p-3 rounded overflow-auto max-h-80">{log}</pre>
      )}
    </div>
  );
}
