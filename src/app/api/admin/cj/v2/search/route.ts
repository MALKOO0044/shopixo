import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin-guard'
import { getSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type CjConfig = {
  email?: string | null
  apiKey?: string | null
  base?: string | null
}

const USD_TO_SAR = 3.75

export async function GET(req: Request) {
  try {
    const guard = await ensureAdmin()
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const keyword = url.searchParams.get('keyword') || ''
    const minStock = parseInt(url.searchParams.get('minStock') || '10')
    const marginPercent = parseInt(url.searchParams.get('marginPercent') || '50')
    const minPrice = parseFloat(url.searchParams.get('minPrice') || '0')
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '1000')
    const pageNum = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50')

    if (!keyword.trim()) {
      return NextResponse.json({ ok: false, error: 'Keyword required' }, { status: 400 })
    }

    const cfg = await getSetting<CjConfig>('cj_config', { email: null, apiKey: null, base: null })
    
    if (!cfg?.email || !cfg?.apiKey) {
      return NextResponse.json({ ok: false, error: 'Supplier API not configured' }, { status: 400 })
    }

    const apiBase = cfg.base || 'https://developers.cjdropshipping.com/api2.0/v1'

    const tokenRes = await fetch(`${apiBase}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cfg.email, password: cfg.apiKey }),
    })
    const tokenData = await tokenRes.json()
    
    if (!tokenData.data?.accessToken) {
      return NextResponse.json({ ok: false, error: 'Failed to authenticate with supplier' }, { status: 400 })
    }
    
    const accessToken = tokenData.data.accessToken

    const searchRes = await fetch(`${apiBase}/product/list`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'CJ-Access-Token': accessToken
      },
      body: JSON.stringify({
        productNameEn: keyword,
        pageNum,
        pageSize,
      }),
    })
    
    const searchData = await searchRes.json()
    
    if (!searchData.data?.list) {
      return NextResponse.json({ 
        ok: true, 
        products: [],
        total: 0,
        page: pageNum
      })
    }

    const products = searchData.data.list
      .filter((p: any) => {
        const stock = p.warehouseInventoryNum || 0
        const price = parseFloat(p.sellPrice || 0)
        return stock >= minStock && price >= minPrice && price <= maxPrice
      })
      .map((p: any) => {
        const costUSD = parseFloat(p.sellPrice || 0)
        const shippingUSD = 2.5
        const totalCostUSD = costUSD + shippingUSD
        const totalCostSAR = totalCostUSD * USD_TO_SAR
        const marginMultiplier = 1 + (marginPercent / 100)
        const finalPriceSAR = Math.ceil(totalCostSAR * marginMultiplier)
        const profitSAR = finalPriceSAR - totalCostSAR
        const actualMargin = totalCostSAR > 0 ? ((profitSAR / totalCostSAR) * 100) : 0

        return {
          id: p.pid,
          cj_product_id: p.pid,
          sku: p.productSku || p.pid,
          nameEn: p.productNameEn || p.productName,
          bigImage: p.productImage,
          sellPrice: p.sellPrice,
          warehouseInventoryNum: p.warehouseInventoryNum || 0,
          categoryId: p.categoryId,
          threeCategoryName: p.threeCategoryName || 'General',
          shippingUSD,
          pricing: {
            baseCostUSD: costUSD,
            shippingUSD,
            totalCostUSD,
            totalCostSAR,
            marginPercent,
            finalPriceSAR,
            roundedPriceSAR: finalPriceSAR,
            profitSAR: Math.round(profitSAR * 100) / 100,
            actualMarginPercent: Math.round(actualMargin)
          }
        }
      })

    return NextResponse.json({
      ok: true,
      products,
      total: searchData.data.total || products.length,
      page: pageNum,
      hasMore: (pageNum * pageSize) < (searchData.data.total || 0)
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Search failed' }, { status: 500 })
  }
}
