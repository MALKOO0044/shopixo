import { getAccessToken } from './v2';

const CJ_API_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

export interface ProductSearchFilters {
  keyword?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  countryCode?: string;
  freeShippingOnly?: boolean;
  sortBy?: 'best_match' | 'listing_count' | 'price' | 'newest' | 'stock';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  includeDescription?: boolean;
  includeCategory?: boolean;
}

export interface CJCategory {
  categoryId: string;
  categoryName: string;
}

export interface CJCategoryGroup {
  categoryFirstName: string;
  categoryFirstList: {
    categorySecondName: string;
    categorySecondList: CJCategory[];
  }[];
}

export interface CJProductSearchResult {
  id: string;
  nameEn: string;
  sku: string;
  bigImage: string;
  sellPrice: string;
  nowPrice?: string;
  discountPrice?: string;
  listedNum: number;
  categoryId: string;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  addMarkStatus: number;
  isVideo: number;
  warehouseInventoryNum: number;
  totalVerifiedInventory: number;
  description?: string;
  deliveryCycle?: string;
  createAt?: number;
}

export interface CJVariant {
  vid: string;
  pid: string;
  variantNameEn: string;
  variantSku: string;
  variantKey: string;
  variantWeight: number;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantSellPrice: number;
  variantImage?: string;
  variantStock?: number;
}

export interface CJShippingOption {
  logisticName: string;
  logisticPrice: number;
  logisticPriceCn?: number;
  logisticAging: string;
  taxesFee?: number;
  clearanceOperationFee?: number;
  totalPostageFee?: number;
}

async function cjApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken();
  const url = `${CJ_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'CJ-Access-Token': token,
  };

  const options: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CJ API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  
  if (data.code && data.code !== 200) {
    throw new Error(`CJ API error ${data.code}: ${data.message || 'Unknown error'}`);
  }
  
  if (data.result === false) {
    throw new Error(`CJ API error: ${data.message || 'Request failed'}`);
  }

  return data;
}

function extractProductList(response: unknown): CJProductSearchResult[] {
  if (!response || typeof response !== 'object') return [];
  
  const data = response as Record<string, unknown>;
  
  if (data.data && typeof data.data === 'object') {
    const dataObj = data.data as Record<string, unknown>;
    
    if (Array.isArray(dataObj.content)) {
      const allProducts: CJProductSearchResult[] = [];
      for (const item of dataObj.content) {
        if (item && typeof item === 'object') {
          const itemObj = item as Record<string, unknown>;
          if (Array.isArray(itemObj.productList)) {
            allProducts.push(...(itemObj.productList as CJProductSearchResult[]));
          }
        }
      }
      return allProducts;
    }
    
    if (Array.isArray(dataObj.list)) {
      return dataObj.list as CJProductSearchResult[];
    }
    
    if (Array.isArray(data.data)) {
      return data.data as CJProductSearchResult[];
    }
  }
  
  if (Array.isArray(data.list)) {
    return data.list as CJProductSearchResult[];
  }
  
  return [];
}

export async function getCategories(): Promise<CJCategoryGroup[]> {
  const response = await cjApiRequest<{
    code: number;
    data: CJCategoryGroup[];
  }>('/product/getCategory');
  
  return response.data || [];
}

export async function searchProducts(
  filters: ProductSearchFilters
): Promise<{
  products: CJProductSearchResult[];
  totalRecords: number;
  totalPages: number;
  currentPage: number;
}> {
  const params = new URLSearchParams();
  
  if (filters.keyword) params.set('keyWord', filters.keyword);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.minPrice !== undefined) params.set('startSellPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('endSellPrice', String(filters.maxPrice));
  if (filters.minStock !== undefined) params.set('startWarehouseInventory', String(filters.minStock));
  if (filters.countryCode) params.set('countryCode', filters.countryCode);
  if (filters.freeShippingOnly) params.set('addMarkStatus', '1');
  
  const sortMap: Record<string, number> = {
    best_match: 0,
    listing_count: 1,
    price: 2,
    newest: 3,
    stock: 4,
  };
  params.set('orderBy', String(sortMap[filters.sortBy || 'best_match']));
  params.set('sort', filters.sortDirection || 'desc');
  
  params.set('page', String(filters.page || 1));
  params.set('size', String(Math.min(100, filters.pageSize || 20)));
  
  const features: string[] = ['enable_category'];
  if (filters.includeDescription) features.push('enable_description');
  params.set('features', features.join(','));

  const response = await cjApiRequest<unknown>(`/product/listV2?${params.toString()}`);
  const allProducts = extractProductList(response);
  
  const responseData = (response as Record<string, unknown>)?.data as Record<string, unknown> | undefined;

  return {
    products: allProducts,
    totalRecords: (responseData?.totalRecords as number) || allProducts.length,
    totalPages: (responseData?.totalPages as number) || 1,
    currentPage: (responseData?.pageNumber as number) || 1,
  };
}

export async function getProductVariants(productId: string): Promise<CJVariant[]> {
  const response = await cjApiRequest<{
    code: number;
    data: CJVariant[];
  }>(`/product/variant/queryByVid?pid=${encodeURIComponent(productId)}`);
  
  return response.data || [];
}

export async function getVariantById(variantId: string): Promise<CJVariant | null> {
  try {
    const response = await cjApiRequest<{
      code: number;
      data: CJVariant;
    }>(`/product/variant/queryByVid?vid=${encodeURIComponent(variantId)}`);
    
    return response.data || null;
  } catch {
    return null;
  }
}

export async function calculateShipping(
  variantId: string,
  quantity: number,
  destinationCountry: string = 'SA'
): Promise<CJShippingOption[]> {
  const response = await cjApiRequest<{
    code: number;
    data: CJShippingOption[];
  }>('/logistic/freightCalculate', 'POST', {
    startCountryCode: 'CN',
    endCountryCode: destinationCountry,
    products: [
      {
        vid: variantId,
        quantity: quantity,
      },
    ],
  });

  return response.data || [];
}

export async function calculateShippingBySku(
  sku: string,
  quantity: number,
  destinationCountry: string = 'SA'
): Promise<CJShippingOption[]> {
  const response = await cjApiRequest<{
    code: number;
    data: Array<{
      postage: string;
      postageCNY?: string;
      arrivalTime?: string;
      option?: {
        enName: string;
        arrivalTime: string;
      };
      wrapPostage?: number;
    }>;
  }>('/logistic/freightCalculateTip', 'POST', {
    reqDTOS: [
      {
        srcAreaCode: 'CN',
        destAreaCode: destinationCountry,
        skuList: [sku],
        freightTrialSkuList: [
          {
            sku: sku,
            skuQuantity: quantity,
          },
        ],
        productProp: ['COMMON'],
        platforms: ['Shopify'],
      },
    ],
  });

  return (response.data || []).map((item) => ({
    logisticName: item.option?.enName || 'Standard Shipping',
    logisticPrice: parseFloat(item.postage) || item.wrapPostage || 0,
    logisticPriceCn: parseFloat(item.postageCNY || '0'),
    logisticAging: item.option?.arrivalTime || item.arrivalTime || '7-15',
  }));
}

export async function getProductDetails(productId: string): Promise<{
  product: CJProductSearchResult | null;
  variants: CJVariant[];
}> {
  const searchResult = await searchProducts({
    keyword: productId,
    pageSize: 1,
    includeDescription: true,
    includeCategory: true,
  });

  const product = searchResult.products.find(
    (p) => p.id === productId || p.sku === productId
  ) || searchResult.products[0] || null;

  let variants: CJVariant[] = [];
  if (product) {
    try {
      variants = await getProductVariants(product.id);
    } catch {
      variants = [];
    }
  }

  return { product, variants };
}

export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  responseTime?: number;
}> {
  const start = Date.now();
  try {
    await getAccessToken();
    const categories = await getCategories();
    const responseTime = Date.now() - start;
    
    return {
      success: true,
      message: `Connected successfully. Found ${categories.length} category groups.`,
      responseTime,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
      responseTime: Date.now() - start,
    };
  }
}
