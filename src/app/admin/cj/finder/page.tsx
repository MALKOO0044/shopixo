"use client";

import { useState } from "react";
import Link from "next/link";

type StartResp = { ok: boolean; jobId?: number; error?: string; tablesMissing?: boolean };

type RunResp = { ok: boolean; done?: boolean; stepsRun?: number; candidatesAddedTotal?: number; error?: string };

type JobItem = {
  id: number;
  status: string;
  step: string | null;
  result: any;
};

type JobResp = { ok: boolean; job?: any; items?: JobItem[]; error?: string };

type CommitResp = { ok: boolean; results?: any[]; error?: string };

export default function CjFinderPage() {
  const [keywords, setKeywords] = useState("men shirts");
  const [targetQuantity, setTargetQuantity] = useState(50);
  const [pageSize, setPageSize] = useState(20);
  const [maxPages, setMaxPages] = useState(5);
  const [margin, setMargin] = useState(0.35);
  const [handling, setHandling] = useState(0);
  const [currency, setCurrency] = useState<'USD'|'SAR'>('USD');

  const [jobId, setJobId] = useState<number | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("General");

  const [selected, setSelected] = useState<Record<string, { includeSkus?: Record<string, boolean> }>>({});
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any[] | null>(null);

  async function start() {
    setLoading(true); setError(null); setCommitResult(null); setTablesMissing(false);
    try {
      const r = await fetch('/api/admin/cj/finder/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords,
          targetQuantity,
          pageSize,
          maxPagesPerKeyword: maxPages,
          margin,
          handlingSar: handling,
          cjCurrency: currency,
        }),
      });
      const j: StartResp = await r.json();
      if (j.tablesMissing) {
        setTablesMissing(true);
        setError(j.error || 'Database tables missing');
        return;
      }
      if (!r.ok || !j.ok || !j.jobId) throw new Error(j.error || `HTTP ${r.status}`);
      setJobId(j.jobId);
      // run to completion
      const rr = await fetch(`/api/admin/jobs/${j.jobId}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'all' }) });
      const jj: RunResp = await rr.json();
      if (!rr.ok || !jj.ok) throw new Error(jj.error || `HTTP ${rr.status}`);
      await refresh(j.jobId);
    } catch (e: any) {
      setError(e?.message || 'Failed to start');
    } finally { setLoading(false); }
  }

  async function refresh(id?: number | null) {
    const jid = id ?? jobId;
    if (!jid) return;
    const r = await fetch(`/api/admin/jobs/${jid}`, { cache: 'no-store' });
    const j: JobResp = await r.json();
    if (!r.ok || !j.ok) { setError(j.error || `HTTP ${r.status}`); return; }
    setItems(j.items || []);
  }

  function toggleSelect(pid: string) {
    setSelected((s) => ({ ...s, [pid]: s[pid] ? undefined as any : {} }));
  }

  function toggleSku(pid: string, sku: string) {
    setSelected((s) => {
      const cur = s[pid] || { includeSkus: {} };
      const next = { includeSkus: { ...(cur.includeSkus || {}) } } as { includeSkus?: Record<string, boolean> };
      next.includeSkus![sku] = !next.includeSkus?.[sku];
      return { ...s, [pid]: next };
    });
  }

  async function commitImport() {
    if (!jobId) return;
    setCommitting(true); setError(null); setCommitResult(null);
    try {
      // Build selected list from job items
      const chosen: Array<{ cj_product_id: string; includeSkus?: string[]; category: string; margin: number; handlingSar: number; cjCurrency: 'USD'|'SAR' }> = [];
      for (const it of items) {
        if (it.step !== 'candidate') continue;
        const pid = String(it?.result?.product?.cj_product_id || '')
        if (!pid) continue;
        if (!selected[pid]) continue;
        const allSkus = Array.isArray(it?.result?.variants) ? it.result.variants.map((v: any) => v?.cj_sku).filter((x: any) => !!x) : [];
        const includesMap = selected[pid]?.includeSkus || {};
        const includeSkus = Object.keys(includesMap).filter(k => includesMap[k]);
        chosen.push({ cj_product_id: pid, includeSkus: includeSkus.length > 0 ? includeSkus : allSkus, category, margin, handlingSar: handling, cjCurrency: currency });
      }
      if (chosen.length === 0) throw new Error('Select at least one product');
      const r = await fetch('/api/admin/cj/import/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected: chosen }) });
      const j: CommitResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setCommitResult(j.results || []);
    } catch (e: any) {
      setError(e?.message || 'Commit failed');
    } finally { setCommitting(false); }
  }

  const candidateItems = items.filter(it => it.step === 'candidate');

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Catalog Finder</h1>
        <Link href="/admin/console" className="text-sm text-blue-600 hover:underline">Back to Console</Link>
      </div>

      {tablesMissing && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-3">Database Setup Required</h2>
          <p className="text-amber-700 mb-4">
            The required database tables do not exist. Please run the migrations in your Supabase SQL Editor.
          </p>
          <div className="bg-white rounded border p-4 text-sm">
            <p className="font-medium mb-2">Required tables:</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li><code className="bg-slate-100 px-1">admin_jobs</code> - For background job tracking</li>
              <li><code className="bg-slate-100 px-1">admin_job_items</code> - For job item details</li>
              <li><code className="bg-slate-100 px-1">kv_settings</code> - For supplier settings</li>
            </ul>
            <p className="mt-3 text-gray-600">Go to Background Jobs page for the full SQL migration script.</p>
          </div>
        </div>
      )}

      {error && !tablesMissing && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <section className="rounded border bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Keywords (comma or space separated)</div>
            <input className="w-full rounded border px-2 py-1" value={keywords} onChange={e => setKeywords(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Target Quantity</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={targetQuantity} onChange={e => setTargetQuantity(Math.max(1, Number(e.target.value||1)))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Category for import</div>
            <input className="w-full rounded border px-2 py-1" value={category} onChange={e => setCategory(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Page size</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={pageSize} onChange={e => setPageSize(Math.max(1, Math.min(50, Number(e.target.value||20))))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Max pages/keyword</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={maxPages} onChange={e => setMaxPages(Math.max(1, Math.min(40, Number(e.target.value||5))))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Margin</div>
            <input type="number" className="w-full rounded border px-2 py-1" step="0.01" value={margin} onChange={e => setMargin(Math.max(0, Number(e.target.value||0)))} />
          </label>
          <label className="text-sm">
            <div className="text-gray-600 mb-1">Handling SAR</div>
            <input type="number" className="w-full rounded border px-2 py-1" value={handling} onChange={e => setHandling(Math.max(0, Number(e.target.value||0)))} />
          </label>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm inline-flex items-center gap-2">
            <input type="radio" name="cur" checked={currency==='USD'} onChange={() => setCurrency('USD')} /> USD
          </label>
          <label className="text-sm inline-flex items-center gap-2">
            <input type="radio" name="cur" checked={currency==='SAR'} onChange={() => setCurrency('SAR')} /> SAR
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={start} disabled={loading} className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Start Search</button>
          {jobId && <button onClick={() => refresh(jobId)} disabled={loading} className="rounded bg-gray-600 px-3 py-1.5 text-white hover:bg-gray-700">Refresh</button>}
          {jobId && <Link href={`/admin/jobs/${jobId}`} className="text-sm text-blue-600 hover:underline">Open Job</Link>}
        </div>
      </section>

      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium mb-3">Candidates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidateItems.map((it) => {
            const p = it.result?.product || {};
            const pid = String(p.cj_product_id || '');
            const vs: any[] = Array.isArray(it.result?.variants) ? it.result.variants : [];
            const images: string[] = Array.isArray(p.images) ? p.images : [];
            const sel = !!selected[pid];
            return (
              <div key={it.id} className={`rounded border ${sel? 'border-blue-400' : 'border-gray-200'} p-3 space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.name || pid}</div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sel} onChange={() => toggleSelect(pid)} /> Select
                  </label>
                </div>
                {images[0] && (
                  <img src={images[0]} alt={p.name||pid} className="w-full h-40 object-cover rounded" />
                )}
                <div className="text-xs text-gray-600">
                  <div>PID: <span className="font-mono">{pid}</span></div>
                  <div>Stock sum: {it.result?.metrics?.stock_sum ?? '-'}</div>
                  <div>Min retail sans ship: {typeof it.result?.metrics?.min_retail_sans_ship === 'number' ? it.result.metrics.min_retail_sans_ship.toFixed(2) : '-'}</div>
                </div>
                {sel && (
                  <div className="rounded border bg-muted/20 overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-1 text-left">Size</th>
                          <th className="p-1 text-left">Color</th>
                          <th className="p-1 text-left">CJ SKU</th>
                          <th className="p-1 text-left">Retail</th>
                          <th className="p-1 text-left">Stock</th>
                          <th className="p-1 text-left">Pick</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vs.map((v, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-1">{v.size || '-'}</td>
                            <td className="p-1">{v.color || '-'}</td>
                            <td className="p-1 font-mono text-[11px]">{v.cj_sku || '-'}</td>
                            <td className="p-1">{typeof v.retail_sar === 'number' ? v.retail_sar.toFixed(2) : '-'}</td>
                            <td className="p-1">{v.stock ?? 0}</td>
                            <td className="p-1">
                              {v.cj_sku ? (
                                <input type="checkbox" onChange={() => toggleSku(pid, v.cj_sku)} checked={!!selected[pid]?.includeSkus?.[v.cj_sku]} />
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <button onClick={commitImport} disabled={committing || candidateItems.length===0} className="rounded bg-green-600 px-3 py-1.5 text-white hover:bg-green-700">Commit Import</button>
        </div>
        {commitResult && (
          <div className="mt-3 rounded border bg-emerald-50 border-emerald-200 p-3 text-sm">
            <div className="font-medium mb-1">Import Results</div>
            <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(commitResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {loading && <div className="text-sm text-gray-500">Working…</div>}
    </div>
  );
}
