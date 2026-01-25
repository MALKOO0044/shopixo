"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Job = { id: number; created_at: string; kind: string; status: string; started_at?: string|null; finished_at?: string|null; totals?: any; error_text?: string|null };

type JobItem = { id: number; status: string; step: string | null; cj_product_id?: string | null; cj_sku?: string | null; result?: any; error_text?: string | null };

type JobResp = { ok: boolean; job?: Job; items?: JobItem[]; error?: string };

type RunResp = { ok: boolean; done?: boolean; stepsRun?: number; candidatesAddedTotal?: number; error?: string };

type ActionResp = { ok: boolean; error?: string };

export default function JobDetailsPage() {
  const params = useParams() as { id: string };
  const id = Number(params?.id || 0);

  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/admin/jobs/${id}`, { cache: 'no-store' });
      const j: JobResp = await r.json();
      if (!r.ok || !j.ok || !j.job) throw new Error(j.error || `HTTP ${r.status}`);
      setJob(j.job); setItems(j.items || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load job');
    } finally { setLoading(false); }
  }

  async function run(mode: 'step'|'all') {
    setActing(true); setError(null);
    try {
      const r = await fetch(`/api/admin/jobs/${id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
      const j: RunResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Run failed');
    } finally { setActing(false); }
  }

  async function cancel() {
    setActing(true); setError(null);
    try {
      const r = await fetch(`/api/admin/jobs/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }) });
      const j: ActionResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Cancel failed');
    } finally { setActing(false); }
  }

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [id]);

  const candidates = items.filter(it => it.step === 'candidate');

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job #{id}</h1>
          {job && (
            <div className="text-sm text-muted-foreground">{job.kind} • {job.status} • created {new Date(job.created_at).toLocaleString()}</div>
          )}
        </div>
        <Link href="/admin/jobs" className="text-sm text-blue-600 hover:underline">Back</Link>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="flex items-center gap-3">
        <button onClick={() => run('step')} disabled={acting || loading} className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Run 1 step</button>
        <button onClick={() => run('all')} disabled={acting || loading} className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">Run to completion</button>
        <button onClick={cancel} disabled={acting || loading} className="rounded bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700">Cancel</button>
      </div>

      <section className="rounded border bg-white p-4">
        <h2 className="text-lg font-medium mb-2">Items</h2>
        <div className="rounded border bg-muted/20 overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Step</th>
                <th className="p-2 text-left">CJ PID</th>
                <th className="p-2 text-left">CJ SKU</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Meta</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t align-top">
                  <td className="p-2 font-mono text-xs">{it.id}</td>
                  <td className="p-2">{it.step || '-'}</td>
                  <td className="p-2 font-mono text-xs">{it.cj_product_id || '-'}</td>
                  <td className="p-2 font-mono text-xs">{it.cj_sku || '-'}</td>
                  <td className="p-2">{it.status}</td>
                  <td className="p-2"><pre className="max-w-[480px] whitespace-pre-wrap break-words text-xs">{it.result ? JSON.stringify(it.result, null, 2) : (it.error_text || '-')}</pre></td>
                </tr>
              ))}
              {(!items || items.length===0) && !loading && (
                <tr><td colSpan={6} className="p-4 text-center text-sm text-muted-foreground">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {candidates.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">Candidates collected: {candidates.length}</div>
        )}
      </section>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
