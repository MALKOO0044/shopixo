"use client";

import React, { useState } from 'react';

export function AdminFulfillCjButton({ orderId }: { orderId: number }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/fulfill-cj`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(`Failed: ${data?.reason || res.statusText}`);
      } else {
        setMsg('CJ order created');
      }
    } catch (e: any) {
      setMsg(e?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50"
      >
        {loading ? 'Submitting…' : 'Fulfill at CJ'}
      </button>
      {msg && <span className="text-xs opacity-80">{msg}</span>}
    </div>
  );
}
