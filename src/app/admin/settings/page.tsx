"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Save, RefreshCw, Shield, Bell, Palette } from "lucide-react";

type SettingsResp = {
  ok: boolean;
  mode?: "monitor" | "copilot" | "autopilot";
  killSwitch?: boolean;
  hasKv?: boolean;
  error?: string;
};

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<"monitor" | "copilot" | "autopilot">("monitor");
  const [killSwitch, setKillSwitch] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/settings", { cache: "no-store" });
      const j: SettingsResp = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setMode((j.mode as any) || "monitor");
      setKillSwitch(!!j.killSwitch);
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(updates: Partial<{ mode: string; killSwitch: boolean }>) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setSuccess("Settings saved");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure store behavior and automation
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          Loading settings...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {!loading && (
        <>
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Automation Mode</h2>
                <p className="text-sm text-gray-500">
                  Control how the system handles automatic actions
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-3">
                {(["monitor", "copilot", "autopilot"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      saveSettings({ mode: m });
                    }}
                    disabled={saving}
                    className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                      mode === m
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  <strong>Monitor:</strong> View proposals only, no automatic actions
                </p>
                <p>
                  <strong>Copilot:</strong> Requires approval for all changes
                </p>
                <p>
                  <strong>Autopilot:</strong> Low-risk actions happen automatically
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4 flex items-center gap-3">
              <Bell className="h-5 w-5 text-red-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Emergency Controls</h2>
                <p className="text-sm text-gray-500">
                  Stop all automated operations if needed
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Kill Switch</p>
                  <p className="text-sm text-gray-500">
                    {killSwitch
                      ? "All write operations are currently blocked"
                      : "System is operating normally"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setKillSwitch(!killSwitch);
                    saveSettings({ killSwitch: !killSwitch });
                  }}
                  disabled={saving}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    killSwitch
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {killSwitch ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4 flex items-center gap-3">
              <Palette className="h-5 w-5 text-purple-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Store Information</h2>
                <p className="text-sm text-gray-500">
                  Basic store configuration
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Store Name</p>
                  <p className="font-medium text-gray-900">Shopixo</p>
                </div>
                <div>
                  <p className="text-gray-500">Currency</p>
                  <p className="font-medium text-gray-900">SAR (Saudi Riyal)</p>
                </div>
                <div>
                  <p className="text-gray-500">Market</p>
                  <p className="font-medium text-gray-900">Saudi Arabia</p>
                </div>
                <div>
                  <p className="text-gray-500">Languages</p>
                  <p className="font-medium text-gray-900">Arabic, English</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-gray-900">Quick Links</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href={"/admin/supplier/settings" as Route}
                  className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Supplier Settings</p>
                  <p className="text-sm text-gray-500">Configure dropshipping API</p>
                </Link>
                <Link
                  href={"/admin/pricing" as Route}
                  className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Pricing Rules</p>
                  <p className="text-sm text-gray-500">Set margins and pricing</p>
                </Link>
                <Link
                  href={"/admin/jobs" as Route}
                  className="rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Background Jobs</p>
                  <p className="text-sm text-gray-500">View job history</p>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
