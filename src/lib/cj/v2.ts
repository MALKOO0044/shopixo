import { createClient } from '@supabase/supabase-js';
import { loadToken, saveToken } from '@/lib/integration/token-store';
import { fetchJson } from '@/lib/http';
import { getSetting } from '@/lib/settings';

// CJ v2 client with token auth per official docs:
// - POST /authentication/getAccessToken { apiKey }
// The apiKey format is: CJUserNum@api@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// Token lives 15 days; refresh token 180 days; getAccessToken limited to once/5 minutes.

type CjConfig = { email?: string | null; apiKey?: string | null; base?: string | null };

async function getCjApiKey(): Promise<string | null> {
  // Prefer env; if missing, attempt kv_settings (key: 'cj_config')
  const envKey = process.env.CJ_API_KEY || null;
  if (envKey) return envKey;
  try {
    const cfg = await getSetting<CjConfig>('cj_config', undefined);
    const apiKey = (cfg?.apiKey || null) as string | null;
    if (apiKey) return apiKey;
  } catch {}
  return envKey;
}

// Keep legacy function for backward compatibility
async function getCjCreds(): Promise<{ email: string | null; apiKey: string | null }> {
  const apiKey = await getCjApiKey();
  const envEmail = process.env.CJ_EMAIL || null;
  return { email: envEmail, apiKey };
}

export async function listCjProductsPage(params: { pageNum: number; pageSize?: number; keyword?: string }): Promise<any> {
  const pageNum = Math.max(1, Math.floor(params.pageNum || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(params.pageSize ?? 20)));
  const kw = params.keyword ? String(params.keyword) : '';
  const qsList = `keyWords=${encodeURIComponent(kw)}&pageSize=${pageSize}&pageNum=${pageNum}`;
  const qsQuery = `keyword=${encodeURIComponent(kw)}&pageSize=${pageSize}&pageNumber=${pageNum}`;

  const endpoints = [
    `/product/list?${qsList}`,
    `/product/query?${qsQuery}`,
    `/product/myProduct/query?${qsQuery}`,
  ];

  const out: any[] = [];
  const seen = new Set<string>();
  let lastErr: any = null;
  for (const ep of endpoints) {
    try {
      const r = await cjFetch<any>(ep);
      const arr = Array.isArray(r?.data?.list)
        ? r.data.list
        : Array.isArray(r?.data?.content)
          ? r.data.content
          : Array.isArray(r?.list)
            ? r.list
            : Array.isArray(r?.data)
              ? r.data
              : Array.isArray(r)
                ? r
                : [];
      for (const it of arr) {
        const pid = String(it?.pid || it?.productId || it?.id || '');
        const key = pid || JSON.stringify(it).slice(0, 120);
        if (!seen.has(key)) { seen.add(key); out.push(it); }
        if (out.length >= pageSize) break;
      }
      if (out.length >= pageSize) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (out.length === 0 && lastErr) throw lastErr;
  return { code: 200, data: { list: out } };
}

// --- Freight / Shipping ---
// Uses CJ's "According to Shipping Method" feature - exact pre-calculated shipping options
// Calls POST /logistic/freightCalculate with variant ID (vid) to get exact CJ pricing
export type CjFreightCalcParams = {
  countryCode: string; // e.g., 'US' - destination country
  startCountryCode?: string; // e.g., 'CN' - origin country (defaults to China)
  quantity?: number;
  vid: string; // variant ID (UUID format required for freightCalculate)
};

export type CjShippingOption = {
  code: string;
  name: string;
  price: number;
  currency?: string;
  logisticAgingDays?: { min?: number; max?: number };
};

export type FreightResult = {
  ok: true;
  options: CjShippingOption[];
} | {
  ok: false;
  reason: 'invalid_vid' | 'no_options' | 'api_error';
  message: string;
};

export async function freightCalculate(params: CjFreightCalcParams): Promise<FreightResult> {
  const startCountry = params.startCountryCode || 'CN';
  const endCountry = params.countryCode || 'US';
  const vid = params.vid;
  const qty = params.quantity ?? 1;
  
  if (!vid) {
    return {
      ok: false,
      reason: 'invalid_vid',
      message: 'Variant ID (vid) is required for shipping calculation',
    };
  }
  
  console.log(`[CJ Freight] Getting "According to Shipping Method" for vid=${vid}, qty=${qty}, ${startCountry} → ${endCountry}`);
  
  try {
    // Use CJ's freightCalculate API - this returns the exact "According to Shipping Method" data
    const body = {
      startCountryCode: startCountry,
      endCountryCode: endCountry,
      products: [{ vid, quantity: qty }],
    };
    
    const r = await cjFetch<any>('/logistic/freightCalculate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    console.log(`[CJ Freight] Response: ${JSON.stringify(r).slice(0, 2000)}`);
    
    const result = parseFreightResponse(r);
    if (result.ok && result.options.length > 0) {
      console.log(`[CJ Freight] Got ${result.options.length} shipping options from CJ "According to Shipping Method"`);
      return result;
    }
    
    // No options returned
    return {
      ok: false,
      reason: 'no_options',
      message: 'CJ returned no shipping options for this variant/destination',
    };
  } catch (e: any) {
    console.error(`[CJ Freight] API error: ${e?.message}`);
    return {
      ok: false,
      reason: 'api_error',
      message: `CJ shipping API error: ${e?.message || 'Unknown error'}`,
    };
  }
}

// Helper to parse freightCalculate response
function parseFreightResponse(r: any): FreightResult {
  const src: any = (r?.data ?? r?.content ?? r ?? []);
  const out: CjShippingOption[] = [];
  const arr: any[] = Array.isArray(src) ? src : Array.isArray(src?.list) ? src.list : [];
  
  for (const it of arr) {
    const price = Number(it.logisticPrice || it.price || it.amount || it.totalFee || it.totalPrice || 0);
    if (price <= 0) continue;
    
    const currency = it.currency || it.ccy || 'USD';
    const name = String(it.logisticName || it.logisticsName || it.name || it.channelName || it.express || 'Shipping');
    const code = String(it.logisticCode || it.logisticsType || it.code || it.channel || name);
    const age = it.logisticAging || it.aging || it.days || null;
    const aging = typeof age === 'string'
      ? (() => { const m = age.match(/(\d+)[^\d]+(\d+)/); if (m) return { min: Number(m[1]), max: Number(m[2]) }; const n = age.match(/(\d+)/); return n ? { min: Number(n[1]) } : undefined; })()
      : (typeof age === 'number' ? { min: age, max: age } : undefined);
    out.push({ code, name, price, currency, logisticAgingDays: aging });
  }
  
  console.log(`[CJ Freight] Parsed ${out.length} shipping options`);
  
  if (out.length > 0) {
    return { ok: true, options: out };
  }
  
  return {
    ok: false,
    reason: 'no_options',
    message: 'No shipping options returned',
  };
}
// - POST /authentication/refreshAccessToken { refreshToken }
// Token lives 15 days; refresh token 180 days; getAccessToken limited to once/5 minutes.
// Env vars supported:
// - CJ_API_BASE (optional; default: https://developers.cjdropshipping.com/api2.0/v1)
// - CJ_ACCESS_TOKEN (optional manual override)
// - CJ_EMAIL (required if no CJ_ACCESS_TOKEN)
// - CJ_API_KEY (required if no CJ_ACCESS_TOKEN)

// --- Variant Inventory Query ---
export type CjVariantInventory = {
  variantSku: string;
  variantName?: string;
  price: number;
  cjStock: number; // CJ warehouse stock
  factoryStock: number; // Factory/supplier stock
  totalStock: number;
};

export async function queryVariantInventory(pid: string, warehouse?: string): Promise<CjVariantInventory[]> {
  const token = await getAccessToken();
  const base = await resolveBase();
  
  const toSafeNumber = (val: any, fallback = 0): number => {
    if (val === undefined || val === null || val === '') return fallback;
    const num = typeof val === 'number' ? val : Number(val);
    return isNaN(num) ? fallback : num;
  };
  
  let allVariants: CjVariantInventory[] = [];
  const stockBySku: Map<string, { cjStock: number; factoryStock: number }> = new Map();
  
  try {
    const inventoryBody: any = { pid };
    if (warehouse) inventoryBody.warehouseId = warehouse;
    
    const stockRes = await fetchJson<any>(`${base}/inventory/queryVariantStock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      body: JSON.stringify(inventoryBody),
      cache: 'no-store',
      timeoutMs: 15000,
    });
    
    console.log(`[CJ Inventory] Response for ${pid}:`, JSON.stringify(stockRes).slice(0, 1500));
    
    const stockData = stockRes?.data;
    
    const parseNestedStocks = (item: any): { cjStock: number; factoryStock: number } => {
      let cjTotal = 0;
      let factoryTotal = 0;
      
      const variantStocks = item.variantStocks || [];
      if (Array.isArray(variantStocks) && variantStocks.length > 0) {
        for (const vs of variantStocks) {
          const innerWarehouseStocks = vs.warehouseStocks || [];
          if (Array.isArray(innerWarehouseStocks) && innerWarehouseStocks.length > 0) {
            for (const ws of innerWarehouseStocks) {
              const warehouseType = String(ws.warehouseType || ws.type || ws.warehouseName || '').toLowerCase();
              const availNum = toSafeNumber(ws.availableNum || ws.availableStock || ws.quantity || ws.stock || 0);
              
              if (warehouseType.includes('cj') || warehouseType.includes('overseas')) {
                cjTotal += availNum;
              } else if (warehouseType.includes('factory') || warehouseType.includes('supplier') || warehouseType.includes('china')) {
                factoryTotal += availNum;
              } else {
                factoryTotal += availNum;
              }
            }
          } else {
            const warehouseType = String(vs.warehouseType || vs.type || '').toLowerCase();
            const availNum = toSafeNumber(vs.availableNum || vs.availableStock || vs.quantity || vs.stock || 0);
            
            if (warehouseType.includes('cj') || warehouseType.includes('overseas')) {
              cjTotal += availNum;
            } else {
              factoryTotal += availNum;
            }
          }
        }
      }
      
      const warehouseStocks = item.warehouseStocks || [];
      if (Array.isArray(warehouseStocks) && warehouseStocks.length > 0 && cjTotal === 0 && factoryTotal === 0) {
        for (const ws of warehouseStocks) {
          const warehouseType = String(ws.warehouseType || ws.type || ws.warehouseName || '').toLowerCase();
          const availNum = toSafeNumber(ws.availableNum || ws.availableStock || ws.quantity || ws.stock || 0);
          
          if (warehouseType.includes('cj') || warehouseType.includes('overseas')) {
            cjTotal += availNum;
          } else {
            factoryTotal += availNum;
          }
        }
      }
      
      if (cjTotal === 0 && factoryTotal === 0) {
        cjTotal = toSafeNumber(item.cjAvailableNum || item.cjStock || item.warehouseStock || 0);
        factoryTotal = toSafeNumber(item.supplierAvailableNum || item.factoryStock || item.factoryAvailableNum || 0);
      }
      
      if (cjTotal === 0 && factoryTotal === 0) {
        const totalStock = toSafeNumber(item.stock || item.totalStock || item.availableNum || item.quantity || 0);
        if (totalStock > 0) {
          factoryTotal = totalStock;
        }
      }
      
      return { cjStock: Math.floor(cjTotal), factoryStock: Math.floor(factoryTotal) };
    };
    
    const stockList = Array.isArray(stockData) ? stockData : (stockData?.list || stockData?.variants || stockData?.variantList || []);
    
    for (const v of stockList) {
      const sku = v.variantSku || v.vid || v.sku || v.skuId || '';
      if (sku) {
        const stocks = parseNestedStocks(v);
        stockBySku.set(sku, stocks);
      }
    }
    console.log(`[CJ Inventory] Parsed ${stockBySku.size} stock entries from inventory API`);
  } catch (e: any) {
    console.error(`[CJ Inventory] Error fetching stock for ${pid}:`, e?.message);
  }
  
  try {
    const variantRes = await fetchJson<any>(`${base}/product/variant/query?pid=${encodeURIComponent(pid)}`, {
      headers: {
        'Content-Type': 'application/json',
        'CJ-Access-Token': token,
      },
      cache: 'no-store',
      timeoutMs: 15000,
    });
    
    console.log(`[CJ Variants] Response for ${pid}:`, JSON.stringify(variantRes).slice(0, 1500));
    
    const variantData = variantRes?.data;
    const variantList = Array.isArray(variantData) ? variantData : (variantData?.list || variantData?.variants || []);
    
    if (Array.isArray(variantList) && variantList.length > 0) {
      console.log(`[CJ Variants] First variant sample:`, JSON.stringify(variantList[0]));
    }
    
    for (const v of variantList) {
      const variantSku = v.variantSku || v.vid || v.sku || v.skuId || v.variantId || '';
      const variantName = v.variantKey || v.variantName || v.skuName || v.variantNameEn || '';
      const price = toSafeNumber(v.variantSellPrice || v.sellPrice || v.variantPrice || v.price, 0);
      
      const stockInfo = stockBySku.get(variantSku);
      
      let cjStock = 0;
      let factoryStock = 0;
      
      if (stockInfo) {
        cjStock = stockInfo.cjStock;
        factoryStock = stockInfo.factoryStock;
      } else {
        cjStock = Math.floor(toSafeNumber(v.cjAvailableNum || v.cjStock || v.warehouseStock || v.cjQuantity || 0));
        factoryStock = Math.floor(toSafeNumber(
          v.supplierAvailableNum || v.factoryStock || v.factoryAvailableNum || 
          v.inventory || v.supplierStock || v.availableStock || 0
        ));
        
        const totalFromVariant = Math.floor(toSafeNumber(v.stock || v.totalStock || v.quantity || v.availableNum || 0));
        if (cjStock === 0 && factoryStock === 0 && totalFromVariant > 0) {
          factoryStock = totalFromVariant;
        }
      }
      
      if (variantSku) {
        allVariants.push({
          variantSku,
          variantName: variantName || undefined,
          price,
          cjStock,
          factoryStock,
          totalStock: cjStock + factoryStock,
        });
      }
    }
  } catch (e: any) {
    console.error(`[CJ Variants] Error fetching variants for ${pid}:`, e?.message);
  }
  
  console.log(`[CJ Variants] Final result: ${allVariants.length} variants for ${pid}`);
  return allVariants;
}

export type CjVariantLike = {
  cjSku?: string;
  size?: string;
  color?: string;
  price?: number;
  stock?: number;
  cjStock?: number; // CJ warehouse stock
  factoryStock?: number; // Factory/supplier stock
  // Optional shipping metadata when provided by CJ
  weightGrams?: number; // unit grams if available; undefined if unknown
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  imageUrl?: string; // optional variant image if provided by CJ
};

export type CjProductLike = {
  productId: string;
  name: string;
  images: string[];
  videoUrl?: string | null;
  variants: CjVariantLike[];
  deliveryTimeHours?: number | null; // estimated delivery time in hours (if provided by CJ)
  processingTimeHours?: number | null; // estimated processing time in hours (if provided by CJ)
  originArea?: string | null;
  originCountryCode?: string | null;
};

let baseOverride: string | null = null;
async function resolveBase(): Promise<string> {
  if (baseOverride) return baseOverride;
  const envBase = process.env.CJ_API_BASE || '';
  if (envBase) return envBase.replace(/\/$/, '');
  try {
    const cfg = await getSetting<CjConfig>('cj_config', undefined);
    const b = (cfg?.base || '').trim();
    if (b) {
      baseOverride = b.replace(/\/$/, '');
      return baseOverride;
    }
  } catch {}
  return 'https://developers.cjdropshipping.com/api2.0/v1';
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type TokenState = {
  accessToken: string;
  accessTokenExpiry?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiry?: string | null;
  lastAuthCallMs: number; // throttle get/refresh to avoid 5-min rule
};

let tokenState: TokenState | null = null;

function ms() { return Date.now(); }

function isNotExpired(iso?: string | null): boolean {
  if (!iso) return true; // if server doesn't give, assume valid
  const t = Date.parse(iso);
  if (isNaN(t)) return true;
  // treat token as expiring 60s earlier for safety
  return t - 60_000 > Date.now();
}

function throttleOk(last: number): boolean {
  // 5 minutes = 300000ms
  return (Date.now() - last) >= 300_000;
}

async function authPost<T>(path: string, body: any): Promise<T> {
  const base = await resolveBase();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  return await fetchJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    cache: 'no-store',
    timeoutMs: 12000,
    retries: 2,
  });
}

async function fetchNewAccessToken(): Promise<TokenState> {
  // Per official CJ API docs: only apiKey is required (format: CJUserNum@api@xxx)
  const apiKey = await getCjApiKey();
  if (!apiKey) throw new Error('Missing CJ_API_KEY (env or admin settings)');

  // Official endpoint per CJ docs
  const r = await authPost<any>('/authentication/getAccessToken', { apiKey });
  
  // Check for success response
  if (r?.code !== 200 || !r?.result) {
    throw new Error(`CJ getAccessToken failed: ${r?.message || 'Unknown error'} (code: ${r?.code})`);
  }
  
  const d = r?.data || {};
  const accessToken = String(d?.accessToken || '');
  
  if (!accessToken) {
    throw new Error('CJ getAccessToken returned empty token');
  }
  
  const out: TokenState = {
    accessToken,
    accessTokenExpiry: d?.accessTokenExpiryDate || null,
    refreshToken: d?.refreshToken || null,
    refreshTokenExpiry: d?.refreshTokenExpiryDate || null,
    lastAuthCallMs: ms(),
  };
  
  // Persist token to database for reuse across requests
  try {
    await saveToken('cj', {
      access_token: out.accessToken,
      access_expiry: out.accessTokenExpiry || null,
      refresh_token: out.refreshToken || null,
      refresh_expiry: out.refreshTokenExpiry || null,
      last_auth_call_at: new Date(out.lastAuthCallMs).toISOString(),
    });
  } catch {}
  
  return out;
}

async function refreshAccessTokenState(state: TokenState): Promise<TokenState> {
  if (!state.refreshToken) return state;
  const r = await authPost<any>('/authentication/refreshAccessToken', { refreshToken: state.refreshToken });
  if (r?.code !== 200 || !r?.result) {
    throw new Error(`refreshAccessToken failed: ${r?.message || 'Unknown error'}`);
  }
  const d = r.data || {};
  const out: TokenState = {
    accessToken: String(d.accessToken || state.accessToken),
    accessTokenExpiry: d.accessTokenExpiryDate || state.accessTokenExpiry || null,
    refreshToken: d.refreshToken || state.refreshToken || null,
    refreshTokenExpiry: d.refreshTokenExpiryDate || state.refreshTokenExpiry || null,
    lastAuthCallMs: ms(),
  };
  try {
    await saveToken('cj', {
      access_token: out.accessToken,
      access_expiry: out.accessTokenExpiry || null,
      refresh_token: out.refreshToken || null,
      refresh_expiry: out.refreshTokenExpiry || null,
      last_auth_call_at: new Date(out.lastAuthCallMs).toISOString(),
    });
  } catch {}
  return out;
}

export async function getAccessToken(): Promise<string> {
  // Manual override for emergencies
  const manual = process.env.CJ_ACCESS_TOKEN;
  if (manual) return manual;

  // Use cached if valid
  if (tokenState && isNotExpired(tokenState.accessTokenExpiry)) {
    return tokenState.accessToken;
  }

  // Try to load from DB token store
  try {
    const row = await loadToken('cj');
    if (row?.access_token) {
      const dbState: TokenState = {
        accessToken: row.access_token,
        accessTokenExpiry: row.access_expiry,
        refreshToken: row.refresh_token,
        refreshTokenExpiry: row.refresh_expiry,
        lastAuthCallMs: row.last_auth_call_at ? Date.parse(row.last_auth_call_at) : 0,
      };
      tokenState = dbState;
      if (isNotExpired(dbState.accessTokenExpiry)) {
        return dbState.accessToken;
      }
    }
  } catch {}

  // Try to refresh if we have a refreshToken and respect 5-min throttle
  if (tokenState && tokenState.refreshToken) {
    if (!throttleOk(tokenState.lastAuthCallMs)) {
      // If throttled but token expired, we still have to try using the old token (may fail downstream)
      return tokenState.accessToken;
    }
    try {
      tokenState = await refreshAccessTokenState(tokenState);
      if (tokenState && isNotExpired(tokenState.accessTokenExpiry)) return tokenState.accessToken;
    } catch {/* will fallback to new token */}
  }

  // Fetch a new token with email/apiKey
  if (!tokenState || throttleOk(tokenState.lastAuthCallMs)) {
    tokenState = await fetchNewAccessToken();
    return tokenState.accessToken;
  }

  throw new Error('Unable to obtain CJ access token (throttled). Please try again shortly.');
}

async function cjFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await resolveBase();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const attempt = async (tok: string) => {
    const headers = {
      'Content-Type': 'application/json',
      'CJ-Access-Token': tok,
      ...(init?.headers || {}),
    } as Record<string, string>;
    return await fetchJson<T>(url, {
      ...init,
      headers,
      cache: 'no-store',
      timeoutMs: 12000,
      retries: 2,
    });
  };

  let token = await getAccessToken();
  try {
    return await attempt(token);
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    const looksAuth = /HTTP\s*(401|403)/i.test(msg) || /token|auth/i.test(msg);
    const freshCreds = await getCjCreds();
    const canFetchFresh = !!(process.env.CJ_EMAIL || freshCreds.email) && !!(process.env.CJ_API_KEY || freshCreds.apiKey);
    if (looksAuth && canFetchFresh) {
      try {
        // Force-fetch a fresh token bypassing any bad manual override
        const fresh = await fetchNewAccessToken();
        tokenState = fresh;
        return await attempt(fresh.accessToken);
      } catch {
        // fall through to rethrow original error
      }
    }
    throw e;
  }
}

// --- Product Rating from Comments ---
export async function getProductRating(pid: string): Promise<{ rating: number | null; reviewCount: number }> {
  try {
    console.log(`[CJ Rating] Fetching comments for pid: ${pid}`);
    const res = await cjFetch<any>(`/product/productComments?pid=${encodeURIComponent(pid)}`);
    console.log(`[CJ Rating] Response for pid ${pid}:`, JSON.stringify(res).slice(0, 800));
    
    // Handle various response structures from CJ API
    // Can be: { data: { list: [], total: X } } or { data: [] } or { list: [] }
    const data = res?.data;
    let list: any[] = [];
    let total = 0;
    
    if (Array.isArray(data)) {
      list = data;
      total = data.length;
    } else if (data?.list && Array.isArray(data.list)) {
      list = data.list;
      total = parseInt(data?.total || String(data.list.length), 10);
    } else if (Array.isArray(res)) {
      list = res;
      total = res.length;
    }
    
    console.log(`[CJ Rating] pid ${pid}: total=${total}, listLength=${list.length}`);
    
    if (list.length === 0) {
      return { rating: null, reviewCount: 0 };
    }
    
    let sumScore = 0;
    let countScores = 0;
    for (const comment of list) {
      // Try multiple possible field names for score
      const scoreVal = comment?.score || comment?.rating || comment?.starScore || comment?.commentScore;
      const score = parseFloat(String(scoreVal || '0'));
      if (score > 0 && score <= 5) {
        sumScore += score;
        countScores++;
      }
    }
    
    if (countScores === 0) {
      return { rating: null, reviewCount: total };
    }
    
    const avgRating = sumScore / countScores;
    console.log(`[CJ Rating] pid ${pid}: avgRating=${avgRating}, reviewCount=${total}`);
    return { rating: Math.round(avgRating * 10) / 10, reviewCount: total };
  } catch (e: any) {
    console.error('[CJ Rating] Failed to fetch product rating:', e?.message || e);
    return { rating: null, reviewCount: 0 };
  }
}

// Batch fetch ratings for multiple products (with concurrency limit)
export async function getProductRatings(pids: string[]): Promise<Map<string, { rating: number | null; reviewCount: number }>> {
  const results = new Map<string, { rating: number | null; reviewCount: number }>();
  const BATCH_SIZE = 5; // Limit concurrent requests
  
  for (let i = 0; i < pids.length; i += BATCH_SIZE) {
    const batch = pids.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (pid) => {
      const result = await getProductRating(pid);
      return { pid, result };
    });
    
    const batchResults = await Promise.allSettled(promises);
    for (const res of batchResults) {
      if (res.status === 'fulfilled') {
        results.set(res.value.pid, res.value.result);
      }
    }
  }
  
  return results;
}

// Helper: Parse JSON array fields from CJ API (e.g., materialNameEn: '["","metal"]')
function parseCjJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr.filter(Boolean).map(String);
      } catch {}
    }
    return trimmed ? [trimmed] : [];
  }
  return [];
}

// Helper: Extract product list from listV2 response (handles various response structures)
function extractListV2Products(res: any): any[] {
  const content = res?.data?.content;
  if (Array.isArray(content) && content[0]?.productList) {
    return content[0].productList;
  }
  if (content && !Array.isArray(content) && content.productList) {
    return content.productList;
  }
  if (res?.data?.list) {
    return res.data.list;
  }
  if (Array.isArray(res?.data)) {
    return res.data;
  }
  return [];
}

// Helper: Copy useful fields from listV2 match to product data
function mergeListV2Fields(productData: any, match: any, source: string): void {
  if (match.description && !productData.description) {
    productData.description = match.description;
    console.log(`[CJ Details] Got description from listV2 (${source}): ${match.description.slice(0, 80)}...`);
  }
  if (match.threeCategoryName) productData.threeCategoryName = match.threeCategoryName;
  if (match.twoCategoryName) productData.twoCategoryName = match.twoCategoryName;
  if (match.oneCategoryName) productData.oneCategoryName = match.oneCategoryName;
  if (match.deliveryCycle) productData.deliveryCycle = match.deliveryCycle;
  if (match.categoryId && !productData.categoryId) productData.categoryId = match.categoryId;
  if (match.listedNum && !productData.listedNum) productData.listedNum = match.listedNum;
  if (match.addMarkStatus !== undefined) productData.addMarkStatus = match.addMarkStatus;
}

// Fetch full product details by PID - returns complete product with all images and variants
export async function fetchProductDetailsByPid(pid: string): Promise<any | null> {
  if (!pid) return null;
  
  try {
    // Fetch product details from /product/query
    const pr = await cjFetch<any>(`/product/query?pid=${encodeURIComponent(pid)}`);
    let productData = pr?.data || pr?.content || pr || null;
    
    if (!productData) return null;
    
    // Get the SKU for more targeted search
    const sku = productData.productSku || productData.sku || '';
    
    // Parse JSON array fields from /product/query (CJ returns some as JSON strings)
    // These contain material, packing info etc that we need for product specs
    const materialArr = parseCjJsonArray(productData.materialNameEn || productData.materialName);
    const packingArr = parseCjJsonArray(productData.packingNameEn || productData.packingName);
    const productKeyArr = parseCjJsonArray(productData.productKeyEn || productData.productKey);
    
    // Store parsed arrays as readable strings for display
    if (materialArr.length > 0 && !productData.materialParsed) {
      productData.materialParsed = materialArr.filter(m => m && m.length > 0).join(', ');
    }
    if (packingArr.length > 0 && !productData.packingParsed) {
      productData.packingParsed = packingArr.filter(p => p && p.length > 0).join(', ');
    }
    if (productKeyArr.length > 0 && !productData.productKeyParsed) {
      productData.productKeyParsed = productKeyArr.filter(k => k && k.length > 0).join(', ');
    }
    
    // Also try to fetch description from listV2 with features parameter
    // The /product/query endpoint does NOT return description, but listV2 with features=enable_description does
    // Use features=enable_description,enable_category for maximum data
    const listV2Features = 'enable_description,enable_category';
    
    if (!productData.description) {
      // Strategy 1: Direct search by PID (most reliable if CJ indexes by PID)
      try {
        const listV2Res = await cjFetch<any>(`/product/listV2?keyWord=${encodeURIComponent(pid)}&page=1&size=5&features=${listV2Features}`);
        const productList = extractListV2Products(listV2Res);
        const match = productList.find((p: any) => p.id === pid || p.pid === pid);
        if (match) {
          mergeListV2Fields(productData, match, `PID search ${pid}`);
        }
      } catch (e: any) {
        console.log(`[CJ Details] listV2 PID search failed for ${pid}:`, e?.message);
      }
    }
    
    // Strategy 2: Search by exact SKU (reliable for products with unique SKUs)
    if (!productData.description && sku) {
      try {
        const listV2Res = await cjFetch<any>(`/product/listV2?keyWord=${encodeURIComponent(sku)}&page=1&size=10&features=${listV2Features}`);
        const productList = extractListV2Products(listV2Res);
        // Find exact match by PID or SKU
        const match = productList.find((p: any) => 
          p.id === pid || p.pid === pid || p.sku === sku || p.productSku === sku
        );
        if (match) {
          mergeListV2Fields(productData, match, `SKU search ${sku}`);
        }
      } catch (e: any) {
        console.log(`[CJ Details] listV2 SKU search failed for ${pid}:`, e?.message);
      }
    }
    
    // Strategy 3: Search by product name if we still don't have description
    if (!productData.description) {
      try {
        const productName = productData.productNameEn || productData.productName || productData.nameEn || '';
        if (productName && productName.length > 5) {
          // Use first 40 chars of product name for search (increased from 30)
          const searchTerm = productName.slice(0, 40).trim();
          const listV2Res = await cjFetch<any>(`/product/listV2?keyWord=${encodeURIComponent(searchTerm)}&page=1&size=20&features=${listV2Features}`);
          const productList = extractListV2Products(listV2Res);
          
          // Find exact match by PID first
          let match = productList.find((p: any) => p.id === pid || p.pid === pid);
          
          // If no PID match, try SKU match
          if (!match && sku) {
            match = productList.find((p: any) => p.sku === sku || p.productSku === sku);
          }
          
          if (match) {
            mergeListV2Fields(productData, match, `name search "${searchTerm.slice(0, 20)}..."`);
          }
        }
      } catch (e: any) {
        console.log(`[CJ Details] listV2 name search failed for ${pid}:`, e?.message);
      }
    }
    
    // Log all weight-related fields from CJ API for debugging shipping costs
    // For shipping, packWeight (total weight with packaging) is more accurate than productWeight (net)
    const weightFields = ['packWeight', 'packingWeight', 'productWeight', 'weight', 'grossWeight', 'netWeight'];
    const foundWeights: Record<string, any> = {};
    for (const f of weightFields) {
      if (productData[f] !== undefined && productData[f] !== null && productData[f] !== '') {
        foundWeights[f] = productData[f];
      }
    }
    if (Object.keys(foundWeights).length > 0) {
      console.log(`[CJ Details] Product ${pid} weight fields:`, JSON.stringify(foundWeights));
    } else {
      console.log(`[CJ Details] Product ${pid}: No weight data in CJ response`);
    }
    
    // Build synthesized productInfo from all available fields (used if no description HTML)
    // This ensures we always have SOMETHING to show on Page 3
    if (!productData.synthesizedInfo) {
      const infoLines: string[] = [];
      
      // Material info
      if (productData.materialParsed) {
        infoLines.push(`Material: ${productData.materialParsed}`);
      }
      
      // Packing/package info
      if (productData.packingParsed) {
        infoLines.push(`Package: ${productData.packingParsed}`);
      }
      
      // Product weight
      const weight = productData.productWeight || productData.packingWeight || productData.packWeight || productData.weight;
      if (weight && Number(weight) > 0) {
        infoLines.push(`Weight: ${weight}g`);
      }
      
      // Dimensions from packing
      const pL = productData.packLength;
      const pW = productData.packWidth;
      const pH = productData.packHeight;
      if (pL && pW && pH && Number(pL) > 0 && Number(pW) > 0 && Number(pH) > 0) {
        infoLines.push(`Package Size: ${pL} × ${pW} × ${pH} cm`);
      }
      
      // Product attributes (color, size options from productKeyEn)
      if (productData.productKeyParsed) {
        infoLines.push(`Attributes: ${productData.productKeyParsed}`);
      }
      
      // Category path
      const category = productData.threeCategoryName || productData.twoCategoryName || productData.categoryName || '';
      if (category && !category.includes('_')) {
        infoLines.push(`Category: ${category}`);
      }
      
      // Delivery cycle
      if (productData.deliveryCycle) {
        infoLines.push(`Delivery: ${productData.deliveryCycle} days`);
      }
      
      // HS code for customs (useful for international shipping)
      if (productData.entryCode && productData.entryNameEn) {
        infoLines.push(`HS Code: ${productData.entryCode} (${productData.entryNameEn})`);
      }
      
      if (infoLines.length > 0) {
        productData.synthesizedInfo = infoLines.join('<br/>');
        console.log(`[CJ Details] Built synthesizedInfo for ${pid}: ${infoLines.length} fields`);
      }
    }
    
    // Log available data fields for debugging
    const specFields = ['description', 'synthesizedInfo', 'materialParsed', 'packingParsed', 'productPropertyList', 'productWeight'];
    const availableSpecs: Record<string, string> = {};
    for (const field of specFields) {
      if (productData[field]) {
        const val = productData[field];
        if (typeof val === 'string') {
          availableSpecs[field] = `"${val.slice(0, 40)}..."`;
        } else if (Array.isArray(val)) {
          availableSpecs[field] = `[${val.length} items]`;
        } else {
          availableSpecs[field] = typeof val;
        }
      }
    }
    console.log(`[CJ Details] Product ${pid} spec fields:`, JSON.stringify(availableSpecs));
    
    // Fetch variants separately to get complete variant data with images
    try {
      const vr = await cjFetch<any>(`/product/variant/query?pid=${encodeURIComponent(pid)}`);
      const variantList = Array.isArray(vr?.data) ? vr.data : (vr?.data?.list || []);
      if (variantList.length > 0) {
        console.log(`[CJ Details] Product ${pid} has ${variantList.length} variants`);
        productData = { ...productData, variantList };
      }
    } catch {
      // Continue without variants if that endpoint fails
    }
    
    return productData;
  } catch (e: any) {
    console.log(`[CJ Details] Failed to fetch details for ${pid}:`, e?.message);
    return null;
  }
}

// Batch fetch product details with concurrency control
export async function fetchProductDetailsBatch(pids: string[], concurrency: number = 5): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < pids.length; i += concurrency) {
    const batch = pids.slice(i, i + concurrency);
    const promises = batch.map(async (pid) => {
      const details = await fetchProductDetailsByPid(pid);
      if (details) {
        results.set(pid, details);
      }
    });
    await Promise.all(promises);
    
    // Small delay between batches to respect rate limits
    if (i + concurrency < pids.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`[CJ Batch] Fetched details for ${results.size}/${pids.length} products`);
  return results;
}

// Query by keyword or PID (CJ sometimes exposes myProduct query); we attempt flexible endpoints.
export async function queryProductByPidOrKeyword(input: { pid?: string; keyword?: string }): Promise<any> {
  const { pid, keyword } = input;
  if (!pid && !keyword) throw new Error('Missing pid or keyword');

  // If PID provided, hit the exact PID endpoint first
  if (pid) {
    try {
      let guidPid = pid;
      // Resolve PID generically: the input may be a numeric web id or a SKU like CJTZ...; search to find the product pid
      try {
        const lr = await cjFetch<any>(`/product/list?keyWords=${encodeURIComponent(pid)}&pageSize=5&pageNum=1`);
        const cand = (Array.isArray(lr?.data?.list) ? lr.data.list : []) as any[];
        if (cand.length > 0 && cand[0]?.pid) {
          guidPid = String(cand[0].pid);
        }
      } catch {}

      // Fetch product details and variants using GUID pid
      const pr = await cjFetch<any>(`/product/query?pid=${encodeURIComponent(guidPid)}`);
      let base = pr?.data || pr?.content || pr || null;
      try {
        const vr = await cjFetch<any>(`/product/variant/query?pid=${encodeURIComponent(guidPid)}`);
        const vlist = Array.isArray(vr?.data) ? vr.data : [];
        if (base) base = { ...base, variantList: vlist };
      } catch { /* ignore variant errors */ }

      const content = base ? [base] : [];
      return { code: 200, data: { content } };
    } catch (e) {
      // Fall through to keyword mode as a last resort
    }
  }

  // Keyword search: try multiple endpoints (CJ requires min pageSize of 10)
  const term = String(keyword || pid);
  const qsKeyword = `keyword=${encodeURIComponent(term)}&pageSize=20&pageNumber=1`;
  const qsList = `keyWords=${encodeURIComponent(term)}&pageSize=20&pageNum=1`;
  const endpoints = [
    `/product/myProduct/query?${qsKeyword}`,
    `/product/query?${qsKeyword}`,
    `/product/list?${qsList}`,
  ];

  const collected: any[] = [];
  let lastErr: any = null;
  for (const ep of endpoints) {
    try {
      const r = await cjFetch<any>(ep);
      const arr = Array.isArray(r?.data?.list)
        ? r.data.list
        : Array.isArray(r?.data?.content)
          ? r.data.content
          : Array.isArray(r?.content)
            ? r.content
            : Array.isArray(r?.data)
              ? r.data
              : Array.isArray(r)
                ? r
                : [];
      for (const it of arr) collected.push(it);
      if (collected.length > 0) break;
    } catch (e: any) {
      lastErr = e;
    }
  }

  if (collected.length === 0 && lastErr) throw lastErr;
  return { code: 200, data: { content: collected } };
}

// Attempt to map a CJ response item to our internal structure.
export function mapCjItemToProductLike(item: any): CjProductLike | null {
  if (!item) return null;
  const productId = String(item.productId || item.pid || item.id || item.vid || item.sku || '');
  if (!productId) return null;
  // --- Title normalization ---
  function cleanTitle(s: string): string {
    try {
      const normalized = s.replace(/[“”„‟‛]/g, '"').replace(/[’‘`]/g, "'");
      const parts = normalized.split(/[",，、|]+/).map((p) => p.trim()).filter(Boolean);
      const uniq: string[] = [];
      for (const p of parts) if (!uniq.includes(p)) uniq.push(p);
      let out = (uniq.join(', ') || normalized).replace(/^"+|"+$/g, '').replace(/\s{2,}/g, ' ').trim();
      if (out.length > 120) { out = out.slice(0, 120).replace(/\s+\S*$/, '').trim(); }
      return out || 'Untitled';
    } catch { return s || 'Untitled'; }
  }
  // Prefer English/Latin/Arabic title if available; fall back to cleaned string with CJK stripped if dominant
  const rawTitle = String(item.nameEn || item.productNameEn || item.englishName || item.productName || item.name || item.title || 'Untitled');
  let name = cleanTitle(rawTitle);
  try {
    const cjk = (name.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g) || []).length;
    if (cjk > 0 && cjk / Math.max(1, name.length) > 0.4) {
      const asciiish = name.replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g, '').replace(/\s{2,}/g, ' ').trim();
      if (asciiish.length >= 10) name = cleanTitle(asciiish);
    }
  } catch {}
  // Optional: basic Arabic terminology replacement if enabled (non-AI, deterministic)
  function arabizeTitle(s: string): string {
    const map: Array<[RegExp, string]> = [
      [/\bwomen'?s\b/ig, 'للنساء'],
      [/\bwomen\b/ig, 'نساء'],
      [/\bmen'?s\b/ig, 'للرجال'],
      [/\bmen\b/ig, 'رجال'],
      [/\bdress(es)?\b/ig, 'فستان'],
      [/\bblouse(s)?\b/ig, 'بلوزة'],
      [/\bskirt(s)?\b/ig, 'تنورة'],
      [/\bshirt(s)?\b/ig, 'قميص'],
      [/\bt[- ]?shirt(s)?\b/ig, 'تيشيرت'],
      [/\bhoodie(s)?\b/ig, 'هودي'],
      [/\bsweater(s)?\b/ig, 'كنزة'],
      [/\bjeans?\b/ig, 'جينز'],
      [/\bpants?\b/ig, 'بنطال'],
      [/\bshorts?\b/ig, 'شورت'],
      [/\bshoes?\b/ig, 'أحذية'],
      [/\bsneakers?\b/ig, 'سنيكرز'],
      [/\blong sleeve(s)?\b/ig, 'أكمام طويلة'],
      [/\bshort sleeve(s)?\b/ig, 'أكمام قصيرة'],
    ];
    let out = s;
    for (const [re, ar] of map) out = out.replace(re, ar);
    return out;
  }
  try {
    if ((process.env.AUTO_ARABIC_TITLES || '').toLowerCase() === 'true') {
      name = arabizeTitle(name);
    }
  } catch {}

  // --- Image collection (robust across CJ shapes) ---
  const imageList: string[] = [];
  const bigImage = (item.productImage || item.bigImage || item.image || item.mainImage || item.mainImageUrl || null) as string | null;
  const pushUrl = (val: any) => { if (typeof val === 'string' && val.trim()) imageList.push(val.trim()); };
  if (bigImage) pushUrl(bigImage);
  // Arrays: strings or objects with common keys
  const arrFields = ['imageList', 'productImageList', 'detailImageList', 'pictureList', 'productImages'] as const;
  for (const key of arrFields) {
    const arr: any = (item as any)[key];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === 'string') pushUrl(it);
        else if (it && typeof it === 'object') pushUrl(it.imageUrl || it.url || it.imgUrl || it.big || it.origin || it.src);
      }
    }
  }
  // String fields that may contain JSON array or comma-separated URLs
  const strFields = ['images', 'imageUrls', 'images2'];
  for (const key of strFields) {
    const v: any = (item as any)[key];
    if (typeof v === 'string' && v.trim()) {
      const s = v.trim();
      if (s.startsWith('[') && s.endsWith(']')) {
        try { const parsed = JSON.parse(s); if (Array.isArray(parsed)) parsed.forEach(pushUrl); } catch {}
      } else if (/[;,|\n\r\t,]+/.test(s)) {
        s.split(/[;,|\n\r\t,]+/).map((x) => x.trim()).filter(Boolean).forEach(pushUrl);
      } else { pushUrl(s); }
    }
  }

  // Filter out non-product images (badges, icons, flags, logos, placeholders) and small thumbs
  const deny = /(sprite|icon|favicon|logo|placeholder|blank|loading|alipay|wechat|whatsapp|kefu|service|avatar|thumb|thumbnail|small|tiny|mini|sizechart|size\s*chart|chart|table|guide|tips|hot|badge|flag|promo|banner|sale|discount|qr)/i;
  function normalizeUrl(u: string): string {
    try {
      const url = new URL(u);
      url.hash = '';
      return url.toString();
    } catch { return u; }
  }
  function isSmall(u: string): boolean {
    // match -100x100 etc in filename; treat as small only if BOTH dims are small
    const m = u.match(/-(\d{2,4})x(\d{2,4})(?=\.)/i);
    if (m) {
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (Math.max(w, h) < 300) return true;
    }
    // query hints like ?w=300 or &h=300: be lenient; only treat as small under 300
    const qm = u.match(/[?&](?:w|width|h|height)=(\d{2,4})/i);
    if (qm && Number(qm[1]) < 300) return true;
    return false;
  }
  function normKey(u: string): string {
    try {
      const url = new URL(u);
      const name = url.pathname.split('/').pop() || u;
      return name.toLowerCase().replace(/-\d{2,4}x\d{2,4}(?=\.)/, '');
    } catch { return u; }
  }

  const seen = new Set<string>();
  const filteredImages: string[] = [];
  for (const raw of imageList) {
    if (!raw) continue;
    const u = normalizeUrl(String(raw));
    if (deny.test(u)) continue;
    if (isSmall(u)) continue;
    const key = normKey(u);
    if (seen.has(key)) continue;
    seen.add(key);
    filteredImages.push(u);
    if (filteredImages.length >= 30) break;
  }

  // Video detection: some responses may contain videoUrl or list
  let videoUrl: string | null = (item.video || item.videoUrl || null) as string | null;
  try {
    const vlist: any = (item as any).videoList || (item as any).videos;
    if (!videoUrl && Array.isArray(vlist) && vlist.length > 0) {
      const first = vlist.find((x: any) => typeof x === 'string') || vlist.find((x: any) => x && typeof x.url === 'string')?.url;
      if (first && typeof first === 'string') videoUrl = first;
    }
  } catch {}

  // Helpers to coerce numbers from various shapes
  const toNum = (x: any): number | undefined => {
    if (typeof x === 'number' && isFinite(x)) return x;
    if (typeof x === 'string') {
      // Remove common separators and non-numeric chars except dot
      const m = x.replace(/[,\s]/g, '').match(/-?\d*\.?\d+/);
      if (m) {
        const n = parseFloat(m[0]);
        return isFinite(n) ? n : undefined;
      }
    }
    return undefined;
  };
  const pickNum = (...cands: any[]): number | undefined => {
    for (const c of cands) {
      const n = toNum(c);
      if (typeof n === 'number' && !isNaN(n)) return n;
    }
    return undefined;
  };

  // Variants: try multiple shapes (skuList, variantList, productSku, etc.)
  const variants: CjVariantLike[] = [];
  const rawVariants = item.variantList || item.skuList || item.productSkuList || item.variants || [];
  if (Array.isArray(rawVariants)) {
    for (const v of rawVariants) {
      const cjSku = v.cjSku || v.sku || v.skuId || v.barcode || null;
      // Extract size/color from multiple shapes
      const baseSize = v.size || v.attributeValue || (v.attributes && (v.attributes.size || v.attributes.Size || v.attributes.SIZE)) || v.optionValue || null;
      const baseColor = (v.color || v.colour || v.Color || (v.attributes && (v.attributes.color || v.attributes.Color || v.attributes.COLOUR))) || null;
      const kvs: Array<{ key: string; value: string }> = [];
      const pushKv = (k: any, val: any) => { if (typeof k === 'string' && typeof val === 'string' && k && val) kvs.push({ key: k, value: val }); };
      try {
        if (Array.isArray(v.attributes)) {
          for (const a of v.attributes) pushKv(a?.name || a?.key || a?.k, a?.value || a?.v);
        }
        if (Array.isArray(v.attributeList)) {
          for (const a of v.attributeList) pushKv(a?.name || a?.key, a?.value);
        }
        if (Array.isArray(v.properties)) {
          for (const a of v.properties) pushKv(a?.name || a?.key, a?.value);
        }
        if (typeof v.variantKey === 'string' && (v as any).variantValue) pushKv(v.variantKey, String((v as any).variantValue));
        if (typeof v.specKey === 'string' && (v as any).specValue) pushKv(v.specKey, String((v as any).specValue));
      } catch {}
      function deriveFromText(t?: string): { size?: string; color?: string } {
        const out: { size?: string; color?: string } = {};
        if (!t || typeof t !== 'string') return out;
        const s = t.trim();
        // Forms like "Color: Black; Size: L"
        const mColor = s.match(/(?:color|colour)\s*[:=]\s*([^;|,\/]*)/i);
        if (mColor && mColor[1]) out.color = mColor[1].trim();
        const mSize = s.match(/size\s*[:=]\s*([^;|,\/]*)/i);
        if (mSize && mSize[1]) out.size = mSize[1].trim();
        // Hyphen or slash separated like "Black-L"
        if (!out.color || !out.size) {
          const parts = s.split(/[\-\/|]+/).map(x => x.trim()).filter(Boolean);
          const sizeTokens = new Set(['XS','S','M','L','XL','XXL','XXXL','2XL','3XL','4XL','5XL','One Size','Free Size']);
          const maybeSize = parts.find(p => sizeTokens.has(p.toUpperCase()) || /^\d{2}$/.test(p));
          const maybeColor = parts.find(p => p && p !== maybeSize);
          if (!out.size && maybeSize) out.size = maybeSize;
          if (!out.color && maybeColor) out.color = maybeColor;
        }
        return out;
      }
      let derivedSize: string | null = null;
      let derivedColor: string | null = null;
      try {
        // Prefer kv pairs
        for (const kv of kvs) {
          const k = String(kv.key).toLowerCase();
          if (!derivedColor && /(color|colour)/i.test(k) && kv.value) derivedColor = kv.value;
          if (!derivedSize && /size/i.test(k) && kv.value) derivedSize = kv.value;
        }
        if (!derivedColor || !derivedSize) {
          const t = String((v as any).skuName || (v as any).variantName || (v as any).variant || '');
          const got = deriveFromText(t);
          if (!derivedColor && got.color) derivedColor = got.color;
          if (!derivedSize && got.size) derivedSize = got.size;
        }
      } catch {}
      const size = baseSize || derivedSize || null;
      const color = baseColor || derivedColor || null;
      const price = pickNum(
        v.sellPrice, v.price, v.discountPrice, v.sellPriceUSD, v.usdPrice, v.listedPrice, v.originalPrice,
        (v.priceInfo && (v.priceInfo.sellPrice || v.priceInfo.price)),
        item.sellPrice, item.price
      );
      const stock = pickNum(
        v.stock, v.quantity, v.sellStock, v.availableStock, v.inventory, v.inventoryQuantity, v.stockNum
      );
      // Try to coerce weight (grams) and dimensions (cm) from common CJ fields
      const weightCandidates = [
        v.weightGram, v.weight_g, v.weightGrams, v.weight,
        (v.packageWeight || v.packingWeight),
      ];
      let weightGrams: number | undefined = undefined;
      for (const c of weightCandidates) {
        const n = pickNum(c);
        if (typeof n === 'number') {
          // Heuristic: if looks like kilograms (very small number), convert to grams
          weightGrams = n < 30 ? Math.round(n * 1000) : Math.round(n);
          break;
        }
      }
      const lengthCm = pickNum(v.length, v.lengthCm, v.l) as number | undefined;
      const widthCm = pickNum(v.width, v.widthCm, v.w) as number | undefined;
      const heightCm = pickNum(v.height, v.heightCm, v.h) as number | undefined;

      variants.push({
        cjSku: cjSku || undefined,
        size: size || undefined,
        color: color || undefined,
        price,
        stock,
        weightGrams,
        lengthCm: typeof lengthCm === 'number' ? lengthCm : undefined,
        widthCm: typeof widthCm === 'number' ? widthCm : undefined,
        heightCm: typeof heightCm === 'number' ? heightCm : undefined,
        imageUrl: (v.whiteImage || v.image || v.imageUrl || v.imgUrl || undefined) as string | undefined,
      });

      // Opportunistically collect variant images if main set is empty or small
      if (filteredImages.length < 30) {
        const vcands = [v.image, v.imageUrl, v.imgUrl, v.whiteImage, v.bigImage];
        for (const c of vcands) {
          if (!c || typeof c !== 'string') continue;
          const u = normalizeUrl(String(c));
          if (deny.test(u)) continue;
          if (isSmall(u)) continue;
          const key = normKey(u);
          if (seen.has(key)) continue;
          seen.add(key);
          filteredImages.push(u);
          if (filteredImages.length >= 30) break;
        }
      }
    }
  }

  // If no variants found, create one from product-level data
  if (variants.length === 0) {
    const productPrice = pickNum(item.sellPrice, item.price, item.salePrice, item.costPrice);
    const productStock = pickNum(item.stock, item.inventory, item.listingCount, item.listedNum) ?? 100;
    const productSku = item.productSku || item.sku || null;
    variants.push({
      cjSku: productSku || undefined,
      price: productPrice,
      stock: typeof productStock === 'number' ? productStock : undefined,
    });
  }

  // Delivery/processing time (hours) if provided
  const deliveryTimeHours = typeof item.deliveryTime === 'number' ? item.deliveryTime : (typeof item.logisticAging === 'number' ? item.logisticAging : null);
  const processingTimeHours = (() => {
    const d = pickNum(item.processingTime, item.handleTime, item.handlingTime, item.processingDays, item.deliveryAging);
    if (typeof d === 'number') {
      // If looks like days (<= 60), convert to hours
      return d <= 60 ? Math.round(d * 24) : Math.round(d);
    }
    return null;
  })();

  const originArea = (item.defaultArea || item.warehouse || item.areaName || null) as string | null;
  const originCountryCode = (item.areaCountryCode || item.countryCode || null) as string | null;

  return {
    productId,
    name,
    images: filteredImages,
    videoUrl: videoUrl || null,
    variants,
    deliveryTimeHours,
    processingTimeHours,
    originArea,
    originCountryCode,
    // Attach processing time in a way that callers can read from item if needed
    // (keeping CjProductLike strict; we will pass via casting if used)
  };
}
