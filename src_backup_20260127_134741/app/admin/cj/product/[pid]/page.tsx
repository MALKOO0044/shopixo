"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

function isBadgeUrl(u: string): boolean {
  return /(hot|badge|icon|favicon|logo|flag|qr|coupon|discount|sale|activity|cart|bag|money|usd|payment|sizechart|size\s*chart|guide|tips)/i.test(u)
}

export default function CjProductAdminPage({ params }: { params: { pid: string } }) {
  const pid = decodeURIComponent(params.pid)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [shipLoading, setShipLoading] = useState(false)
  const [shipResp, setShipResp] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true); setErr(null)
      try {
        const res = await fetch(`/api/cj/inspect/${encodeURIComponent(pid)}`, { cache: 'no-store' })
        const j = await res.json()
        if (!mounted) return
        if (!res.ok) setErr(j?.error || 'Failed to load'); else setData(j)
      } catch (e: any) {
        if (!mounted) return
        setErr(e?.message || String(e))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [pid])

  const flaggedImages: string[] = useMemo(() => {
    const raw = data?.raw || {}
    const list: string[] = Array.isArray(raw.imageList) ? raw.imageList.filter((x: any) => typeof x === 'string') : []
    return list.filter(isBadgeUrl)
  }, [data])

  async function forceResync() {
    setSyncing(true)
    try {
      const res = await fetch(`/api/cj/sync/product/${encodeURIComponent(pid)}?updateImages=true&updateVideo=true&updatePrice=true`, { cache: 'no-store' })
      const j = await res.json()
      alert(res.ok ? 'Re-sync complete' : `Re-sync failed: ${j?.error || res.status}`)
    } catch (e: any) {
      alert(`Re-sync error: ${e?.message || String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  async function calcShipping(formData: FormData) {
    setShipLoading(true)
    setShipResp(null)
    try {
      const body = {
        countryCode: String(formData.get('countryCode') || 'SA').toUpperCase(),
        pid,
        sku: String(formData.get('sku') || ''),
        quantity: Number(formData.get('quantity') || 1),
      }
      const res = await fetch('/api/cj/shipping/calc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await res.json()
      setShipResp({ status: res.status, body: j })
    } catch (e: any) {
      setShipResp({ error: e?.message || String(e) })
    } finally {
      setShipLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CJ Product • {pid}</h1>
        <Link className="text-blue-600 underline" href="/admin/cj">Back</Link>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p className="text-red-600">{err}</p>}

      {data?.mapped && (
        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Mapped</h2>
            <div className="border rounded p-3">
              <p className="font-semibold">Title:</p>
              <p className="mb-2">{data.mapped.name}</p>
              <p className="font-semibold">Images:</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(data.mapped.images || []).slice(0, 12).map((u: string) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="img" className="w-full h-24 object-cover rounded border" />
                ))}
              </div>
              <p className="font-semibold">Variants:</p>
              <ul className="text-sm list-disc pl-6">
                {(data.mapped.variants || []).slice(0, 10).map((v: any, i: number) => (
                  <li key={i}>{v.cjSku || '—'} • {v.size || '-'} • price: {v.price ?? '-'} • stock: {v.stock ?? '-'}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-medium">Raw (first 1)</h2>
            <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-96">{JSON.stringify(data.raw, null, 2)}</pre>
          </div>
        </section>
      )}

      <section className="space-y-2 border rounded p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Actions</h2>
          <button onClick={forceResync} disabled={syncing} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{syncing ? 'Resyncing…' : 'Force Re-sync (images+video+price)'}</button>
        </div>
        <div className="text-xs opacity-70">Flagged images (likely badges/logos): {flaggedImages.length}</div>
        {flaggedImages.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {flaggedImages.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="flagged" className="w-full h-20 object-cover rounded border" />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2 border rounded p-4">
        <h2 className="text-lg font-medium">Shipping Preview</h2>
        <form action={calcShipping} className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-sm">Country<input name="countryCode" defaultValue="SA" className="border rounded px-2 py-1"/></label>
          <label className="flex flex-col text-sm">Variant SKU<input name="sku" className="border rounded px-2 py-1" placeholder="optional"/></label>
          <label className="flex flex-col text-sm">Quantity<input name="quantity" type="number" defaultValue={1} min={1} className="border rounded px-2 py-1"/></label>
          <div className="col-span-2"><button disabled={shipLoading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{shipLoading ? 'Calculating…' : 'Calculate'}</button></div>
        </form>
        {shipResp && (
          <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-80">{JSON.stringify(shipResp, null, 2)}</pre>
        )}
      </section>
    </main>
  )
}
