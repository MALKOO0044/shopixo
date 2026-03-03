"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SettingsResp = { ok: boolean; mode?: "monitor"|"copilot"|"autopilot"; killSwitch?: boolean; hasKv?: boolean; error?: string };

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"monitor"|"copilot"|"autopilot">("monitor");
  const [kill, setKill] = useState(false);
  const [hasKv, setHasKv] = useState<boolean>(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      const j: SettingsResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMode((j.mode as any) || "monitor");
      setKill(!!j.killSwitch);
      setHasKv(!!j.hasKv);
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function save(next: Partial<{ mode: "monitor"|"copilot"|"autopilot"; killSwitch: boolean }>) {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Admin Settings</h1>
        <Link href="/admin/console" className="text-sm text-blue-600 hover:underline">Back to Console</Link>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="rounded border bg-white p-4">
        <div className="mb-4">
          <div className="text-sm text-muted-foreground">Operating Mode</div>
          <div className="mt-2 flex gap-3">
            {["monitor","copilot","autopilot"].map((m) => (
              <button
                key={m}
                onClick={() => save({ mode: m as any })}
                disabled={saving || loading}
                className={`rounded px-3 py-1.5 text-sm border ${mode===m?"bg-blue-600 text-white border-blue-600":"bg-white text-blue-700 border-blue-300 hover:bg-blue-50"}`}
              >{m}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Monitor: proposals only · Copilot: approval required · Autopilot: low-risk auto actions</p>
        </div>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Kill‑Switch</div>
          <div className="mt-2">
            <button
              onClick={() => save({ killSwitch: !kill })}
              disabled={saving || loading}
              className={`rounded px-3 py-1.5 text-sm border ${kill?"bg-red-600 text-white border-red-600":"bg-white text-red-700 border-red-300 hover:bg-red-50"}`}
            >{kill ? "Turn OFF" : "Turn ON"}</button>
            <span className="ml-3 text-sm">{kill ? "All write operations are blocked" : "Writes are enabled"}</span>
          </div>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Key-Value Settings Table</div>
            <div className="text-sm text-muted-foreground">kv_settings {hasKv ? "is present" : "is missing"}</div>
          </div>
          <Link href="/admin/console/setup" className="text-sm text-blue-600 hover:underline">Open DB Setup</Link>
        </div>
      </div>

      {(loading || saving) && <div className="text-sm text-gray-500">Working…</div>}
    </div>
  );
}
