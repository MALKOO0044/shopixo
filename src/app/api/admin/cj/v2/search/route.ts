import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, type ProductSearchFilters, type CJProductSearchResult } from '@/lib/cj/product-discovery';
import { calculateKSAPrice, type PricingResult } from '@/lib/cj/ksa-pricing';

export const dynamic = 'force-dynamic';

interface SearchRequest {
  keyword?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  minRating?: number;
  freeShippingOnly?: boolean;
  quantity?: number;
  marginPercent?: number;
  page?: number;
  pageSize?: number;
}

interface ProductWithPricing extends CJProductSearchResult {
  shippingUSD: number;
  shippingDays: string;
  pricing: PricingResult;
}

function estimateShippingToKSA(cjPriceUSD: number): { shippingUSD: number; shippingDays: string } {
  if (cjPriceUSD < 5) return { shippingUSD: 2.50, shippingDays: '10-20' };
  if (cjPriceUSD < 15) return { shippingUSD: 3.50, shippingDays: '10-18' };
  if (cjPriceUSD < 30) return { shippingUSD: 4.50, shippingDays: '8-15' };
  if (cjPriceUSD < 50) return { shippingUSD: 5.50, shippingDays: '7-14' };
  return { shippingUSD: 7.00, shippingDays: '7-12' };
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();

    const filters: ProductSearchFilters = {
      keyword: body.keyword,
      categoryId: body.categoryId,
      minPrice: body.minPrice,
      maxPrice: body.maxPrice,
      minStock: body.minStock || 10,
      freeShippingOnly: body.freeShippingOnly,
      sortBy: 'listing_count',
      sortDirection: 'desc',
      page: body.page || 1,
      pageSize: Math.min(body.pageSize || 20, 100),
      includeDescription: true,
      includeCategory: true,
    };

    const searchResult = await searchProducts(filters);

    const productsWithPricing: ProductWithPricing[] = [];
    const targetQuantity = body.quantity || searchResult.products.length;

    for (const product of searchResult.products) {
      if (productsWithPricing.length >= targetQuantity) break;

      if (body.minRating && product.listedNum < (body.minRating * 100)) {
        continue;
      }

      const cjPrice = parseFloat(product.discountPrice || product.nowPrice || product.sellPrice) || 0;
      
      if (cjPrice <= 0) continue;
      
      const { shippingUSD, shippingDays } = estimateShippingToKSA(cjPrice);
      
      const pricing = calculateKSAPrice({
        cjPriceUSD: cjPrice,
        shippingUSD,
        categorySlug: product.threeCategoryName?.toLowerCase(),
        marginPercent: body.marginPercent,
      });

      productsWithPricing.push({
        ...product,
        shippingUSD,
        shippingDays,
        pricing,
      });
    }

    return NextResponse.json({
      ok: true,
      products: productsWithPricing,
      totalFound: searchResult.totalRecords,
      totalPages: searchResult.totalPages,
      currentPage: searchResult.currentPage,
      returned: productsWithPricing.length,
    });
  } catch (error) {
    console.error('CJ Search error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}
