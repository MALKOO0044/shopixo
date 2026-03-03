"use client"

import { useState } from 'react'

export default function CjShippingPage() {
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<any>(null)

  async function onSubmit(formData: FormData) {
    setLoading(true)
    setResp(null)
    const body: any = {
      countryCode: String(formData.get('countryCode') || 'SA').toUpperCase(),
      zipCode: String(formData.get('zipCode') || ''),
      pid: String(formData.get('pid') || ''),
      sku: String(formData.get('sku') || ''),
      quantity: Number(formData.get('quantity') || 1),
      weightGram: Number(formData.get('weightGram') || 0) || undefined,
      lengthCm: Number(formData.get('lengthCm') || 0) || undefined,
      widthCm: Number(formData.get('widthCm') || 0) || undefined,
      heightCm: Number(formData.get('heightCm') || 0) || undefined,
    }
    try {
      const res = await fetch('/api/cj/shipping/calc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      setResp({ status: res.status, body: j })
    } catch (e: any) {
      setResp({ error: e?.message || String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Shipping Calculator</h1>
      <form action={onSubmit} className="grid grid-cols-2 gap-3 border rounded p-4">
        <label className="flex flex-col text-sm">Country Code<input name="countryCode" defaultValue="SA" className="border rounded px-2 py-1"/></label>
        <label className="flex flex-col text-sm">ZIP (optional)<input name="zipCode" className="border rounded px-2 py-1"/></label>
        <label className="flex flex-col text-sm">Product ID<input name="pid" placeholder="GUID pid" className="border rounded px-2 py-1"/></label>
        <label className="flex flex-col text-sm">Variant SKU<input name="sku" placeholder="cjSku" className="border rounded px-2 py-1"/></label>
        <label className="flex flex-col text-sm">Quantity<input name="quantity" type="number" defaultValue={1} min={1} className="border rounded px-2 py-1"/></label>
        <div className="col-span-2 grid grid-cols-3 gap-3">
          <label className="flex flex-col text-sm">Weight (g)<input name="weightGram" type="number" className="border rounded px-2 py-1"/></label>
          <label className="flex flex-col text-sm">L (cm)<input name="lengthCm" type="number" className="border rounded px-2 py-1"/></label>
          <label className="flex flex-col text-sm">W (cm)<input name="widthCm" type="number" className="border rounded px-2 py-1"/></label>
          <label className="flex flex-col text-sm">H (cm)<input name="heightCm" type="number" className="border rounded px-2 py-1"/></label>
        </div>
        <div className="col-span-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{loading ? 'Calculating...' : 'Calculate'}</button>
        </div>
      </form>
      {resp && (
        <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-96">{JSON.stringify(resp, null, 2)}</pre>
      )}
    </main>
  )
}
