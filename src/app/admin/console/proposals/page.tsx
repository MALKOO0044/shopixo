"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Proposal = {
  id: string;
  created_at: string;
  status: "pending"|"approved"|"rejected"|"executed";
  action_type?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  score?: number | null;
  reasons?: any;
  impact?: any;
  payload?: any;
  mode?: string | null;
  tags?: string[] | null;
};

type ListResp = { ok: boolean; proposals?: Proposal[]; error?: string };

type UpdateResp = { ok: boolean; proposal?: Proposal; error?: string };

export default function ProposalsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('pending');
  const [rows, setRows] = useState<Proposal[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/admin/proposals?status=${encodeURIComponent(status)}`, { cache: 'no-store' });
      const j: ListResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setRows(j.proposals || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load proposals');
      setRows([]);
    } finally { setLoading(false); }
  }

  async function update(id: string, nextStatus: Proposal['status']) {
    setActingId(id); setError(null);
    try {
      const r = await fetch('/api/admin/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: nextStatus }) });
      const j: UpdateResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update proposal');
    } finally { setActingId(null); }
  }

  useEffect(() => { load(); }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Proposals</h1>
        <Link href="/admin/console" className="text-sm text-blue-600 hover:underline">Back to Console</Link>
      </div>

      <div className="flex items-center gap-3">
        {['pending','approved','rejected','executed'].map(s => (
          <button key={s} onClick={() => setStatus(s)} disabled={loading} className={`rounded px-3 py-1.5 text-sm border ${status===s?"bg-blue-600 text-white border-blue-600":"bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}>{s}</button>
        ))}
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="rounded border bg-white overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Created</th>
              <th className="p-2 text-left">Action</th>
              <th className="p-2 text-left">Entity</th>
              <th className="p-2 text-left">Score</th>
              <th className="p-2 text-left">Reasons</th>
              <th className="p-2 text-left">Impact</th>
              <th className="p-2 text-left">Mode</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((p) => (
              <tr key={p.id} className="border-t align-top">
                <td className="p-2 font-mono text-xs">{p.id.slice(0,8)}…</td>
                <td className="p-2">{new Date(p.created_at).toLocaleString()}</td>
                <td className="p-2">{p.action_type || '-'}</td>
                <td className="p-2">{p.entity_type || '-'} {p.entity_id ? `#${p.entity_id}` : ''}</td>
                <td className="p-2">{typeof p.score === 'number' ? p.score.toFixed(2) : '-'}</td>
                <td className="p-2"><pre className="max-w-[300px] whitespace-pre-wrap break-words text-xs">{p.reasons ? JSON.stringify(p.reasons) : '-'}</pre></td>
                <td className="p-2"><pre className="max-w-[300px] whitespace-pre-wrap break-words text-xs">{p.impact ? JSON.stringify(p.impact) : '-'}</pre></td>
                <td className="p-2">{p.mode || '-'}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => update(p.id, 'approved')} disabled={actingId===p.id || loading} className="rounded bg-green-600 px-2 py-1 text-white text-xs hover:bg-green-700">Approve</button>
                    <button onClick={() => update(p.id, 'rejected')} disabled={actingId===p.id || loading} className="rounded bg-amber-600 px-2 py-1 text-white text-xs hover:bg-amber-700">Reject</button>
                    <button onClick={() => update(p.id, 'executed')} disabled={actingId===p.id || loading} className="rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-700">Mark Executed</button>
                  </div>
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && !loading && (
              <tr><td colSpan={10} className="p-4 text-center text-sm text-muted-foreground">No proposals</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
    </div>
  );
}
