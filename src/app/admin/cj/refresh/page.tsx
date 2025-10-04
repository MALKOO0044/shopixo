"use client"

import { useState } from 'react'

export default function CjRefreshPage() {
  const [catLoading, setCatLoading] = useState(false)
  const [catResp, setCatResp] = useState<any>(null)
  const [prodLoading, setProdLoading] = useState(false)
  const [prodResp, setProdResp] = useState<any>(null)

  async function runCatalog(formData: FormData) {
    setCatLoading(true)
    setCatResp(null)
    const pageNum = Number(formData.get('pageNum') || 1)
    const pageSize = Number(formData.get('pageSize') || 20)
    const keyword = String(formData.get('keyword') || '')
    const updateImages = formData.get('updateImages') === 'on'
    const updateVideo = formData.get('updateVideo') === 'on'
    const updatePrice = formData.get('updatePrice') === 'on'
    const qs = new URLSearchParams({
      pageNum: String(pageNum),
      pageSize: String(pageSize),
      ...(keyword ? { keyword } : {}),
      updateImages: String(updateImages),
      updateVideo: String(updateVideo),
      updatePrice: String(updatePrice),
    })
    try {
      const res = await fetch(`/api/cj/sync/catalog?${qs.toString()}`, { cache: 'no-store' })
      const j = await res.json()
      setCatResp({ status: res.status, body: j })
    } catch (e: any) {
      setCatResp({ error: e?.message || String(e) })
    } finally {
      setCatLoading(false)
    }
  }

  async function runProduct(formData: FormData) {
    setProdLoading(true)
    setProdResp(null)
    const pid = String(formData.get('pid') || '').trim()
    const updateImages = formData.get('p_updateImages') === 'on'
    const updateVideo = formData.get('p_updateVideo') === 'on'
    const updatePrice = formData.get('p_updatePrice') === 'on'
    if (!pid) { setProdResp({ error: 'pid required' }); setProdLoading(false); return }
    const qs = new URLSearchParams({
      updateImages: String(updateImages),
      updateVideo: String(updateVideo),
      updatePrice: String(updatePrice),
    })
    try {
      const res = await fetch(`/api/cj/sync/product/${encodeURIComponent(pid)}?${qs.toString()}`, { cache: 'no-store' })
      const j = await res.json()
      setProdResp({ status: res.status, body: j })
    } catch (e: any) {
      setProdResp({ error: e?.message || String(e) })
    } finally {
      setProdLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">CJ Catalog Refresh</h1>

      <section className="space-y-3 border rounded p-4">
        <h2 className="text-lg font-medium">Batch Catalog Sync</h2>
        <form action={runCatalog} className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-sm">Page Number<input name="pageNum" type="number" defaultValue={1} min={1} className="border rounded px-2 py-1"/></label>
          <label className="flex flex-col text-sm">Page Size<input name="pageSize" type="number" defaultValue={20} min={1} max={50} className="border rounded px-2 py-1"/></label>
          <label className="col-span-2 flex flex-col text-sm">Keyword (optional)<input name="keyword" placeholder="e.g. women dress" className="border rounded px-2 py-1"/></label>
          <div className="col-span-2 flex items-center gap-6 text-sm">
            <label className="inline-flex items-center gap-2"><input name="updateImages" type="checkbox" defaultChecked/>Update Images</label>
            <label className="inline-flex items-center gap-2"><input name="updateVideo" type="checkbox" defaultChecked/>Update Video</label>
            <label className="inline-flex items-center gap-2"><input name="updatePrice" type="checkbox" defaultChecked/>Update Price</label>
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={catLoading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{catLoading ? 'Working...' : 'Run Batch'}</button>
          </div>
        </form>
        {catResp && (
          <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-80">{JSON.stringify(catResp, null, 2)}</pre>
        )}
      </section>

      <section className="space-y-3 border rounded p-4">
        <h2 className="text-lg font-medium">Re-sync Single Product (by CJ PID)</h2>
        <form action={runProduct} className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col text-sm">CJ PID<input name="pid" placeholder="e.g. GUID pid" className="border rounded px-2 py-1"/></label>
          <div className="col-span-2 flex items-center gap-6 text-sm">
            <label className="inline-flex items-center gap-2"><input name="p_updateImages" type="checkbox" defaultChecked/>Update Images</label>
            <label className="inline-flex items-center gap-2"><input name="p_updateVideo" type="checkbox" defaultChecked/>Update Video</label>
            <label className="inline-flex items-center gap-2"><input name="p_updatePrice" type="checkbox" defaultChecked/>Update Price</label>
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={prodLoading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{prodLoading ? 'Working...' : 'Re-sync Product'}</button>
          </div>
        </form>
        {prodResp && (
          <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-80">{JSON.stringify(prodResp, null, 2)}</pre>
        )}
      </section>
    </main>
  )
}
