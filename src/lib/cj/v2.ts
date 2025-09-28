import { createClient } from '@supabase/supabase-js';

// Minimal CJ v2 client: uses a provided CJ access token if available, with optional email/password login (if later enabled).
// Env vars:
// - CJ_API_BASE (optional; default: https://developers.cjdropshipping.com/api2.0/v1)
// - CJ_ACCESS_TOKEN (optional)
// - CJ_EMAIL, CJ_PASSWORD (optional; for future getAccessToken implementation)

export type CjVariantLike = {
  cjSku?: string;
  size?: string;
  price?: number;
  stock?: number;
};

export type CjProductLike = {
  productId: string;
  name: string;
  images: string[];
  videoUrl?: string | null;
  variants: CjVariantLike[];
  deliveryTimeHours?: number | null; // estimated delivery time in hours (if provided by CJ)
  originArea?: string | null;
  originCountryCode?: string | null;
};

function getBase(): string {
  const b = process.env.CJ_API_BASE || 'https://developers.cjdropshipping.com/api2.0/v1';
  return b.replace(/\/$/, '');
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Prefer explicit CJ_ACCESS_TOKEN for now (manual provisioning)
  const envToken = process.env.CJ_ACCESS_TOKEN;
  if (envToken) return envToken;

  // TODO: Implement login/refresh with CJ_EMAIL/CJ_PASSWORD when available from docs.
  // For now, throw a descriptive error so user can set CJ_ACCESS_TOKEN.
  throw new Error('CJ API access token not configured. Set CJ_ACCESS_TOKEN env var, or provide CJ_EMAIL & CJ_PASSWORD once auth flow is enabled.');
}

async function cjFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const url = `${getBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method: (init?.method || 'GET'),
    headers: {
      'Content-Type': 'application/json',
      'CJ-Access-Token': token,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    body: init?.body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`CJ API error ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    // @ts-ignore
    return text as T;
  }
}

// Query by keyword or PID (CJ sometimes exposes myProduct query); we attempt flexible endpoints.
export async function queryProductByPidOrKeyword(input: { pid?: string; keyword?: string }): Promise<any> {
  const { pid, keyword } = input;
  // Try myProduct/query by keyword first when keyword present
  if (keyword) {
    return cjFetch<any>(`/product/myProduct/query?keyword=${encodeURIComponent(keyword)}&pageSize=10&pageNumber=1`);
  }
  // Try list with keyword=PID as a workaround
  if (pid) {
    return cjFetch<any>(`/product/myProduct/query?keyword=${encodeURIComponent(pid)}&pageSize=10&pageNumber=1`);
  }
  throw new Error('Missing pid or keyword');
}

// Attempt to map a CJ response item to our internal structure.
export function mapCjItemToProductLike(item: any): CjProductLike | null {
  if (!item) return null;
  const productId = String(item.productId || item.id || item.vid || item.sku || '');
  if (!productId) return null;
  const name = String(item.nameEn || item.name || item.title || 'Untitled');
  const bigImage = (item.bigImage || item.image || null) as string | null;
  const imageList: string[] = [];
  if (Array.isArray(item.imageList)) {
    for (const u of item.imageList) if (typeof u === 'string') imageList.push(u);
  }
  if (bigImage) imageList.unshift(bigImage);

  // Video detection: some responses may contain videoUrl field
  const videoUrl = (item.video || item.videoUrl || null) as string | null;

  // Variants: try multiple shapes (skuList, variantList, productSku, etc.)
  const variants: CjVariantLike[] = [];
  const rawVariants = item.variantList || item.skuList || item.productSkuList || item.variants || [];
  if (Array.isArray(rawVariants)) {
    for (const v of rawVariants) {
      const cjSku = v.cjSku || v.sku || v.skuId || v.barcode || null;
      const size = v.size || v.attributeValue || (v.attributes && v.attributes.size) || v.optionValue || null;
      const price = typeof v.sellPrice === 'number' ? v.sellPrice
        : typeof v.price === 'number' ? v.price
        : v.discountPrice ? Number(v.discountPrice) : (item.sellPrice ? Number(item.sellPrice) : undefined);
      const stock = (typeof v.stock === 'number') ? v.stock : (typeof v.quantity === 'number' ? v.quantity : undefined);
      variants.push({ cjSku: cjSku || undefined, size: size || undefined, price, stock });
    }
  }

  // Delivery time (hours) if provided
  const deliveryTimeHours = typeof item.deliveryTime === 'number' ? item.deliveryTime : null;

  const originArea = (item.defaultArea || item.warehouse || item.areaName || null) as string | null;
  const originCountryCode = (item.areaCountryCode || item.countryCode || null) as string | null;

  return {
    productId,
    name,
    images: Array.from(new Set(imageList.filter(Boolean))),
    videoUrl: videoUrl || null,
    variants,
    deliveryTimeHours,
    originArea,
    originCountryCode,
  };
}
