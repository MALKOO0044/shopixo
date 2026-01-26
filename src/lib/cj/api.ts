type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

<<<<<<< HEAD
// Global token cache to avoid rate limits (CJ allows 1 auth request per 300 seconds)
const globalTokenCache: {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number;
  lastRateLimitHit: number; // Only set when we actually hit a 429
} = {
  accessToken: null,
  refreshToken: null,
  tokenExpiry: 0,
  lastRateLimitHit: 0,
};

// In-flight token fetch promise to prevent concurrent auth requests
let tokenFetchPromise: Promise<string> | null = null;

const RATE_LIMIT_COOLDOWN_MS = 310000; // 310 seconds (slightly more than CJ's 300s limit)

export class CjApi {
  private email: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(opts?: { sandbox?: boolean }) {
    this.email = process.env.CJ_EMAIL || '';
    this.apiKey = process.env.CJ_API_KEY || '';
    this.baseUrl = (opts?.sandbox ? process.env.CJ_API_BASE_SANDBOX : process.env.CJ_API_BASE) || 'https://developers.cjdropshipping.com/api2.0/v1';
  }

  isConfigured(): boolean {
    return !!(this.email && this.apiKey);
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (globalTokenCache.accessToken && Date.now() < globalTokenCache.tokenExpiry) {
      return globalTokenCache.accessToken;
    }

    // If another request is already fetching a token, wait for it
    if (tokenFetchPromise) {
      console.log('[CJ API] Waiting for in-flight token fetch...');
      return tokenFetchPromise;
    }

    // Check if we're in rate limit cooldown (only applies if we actually hit a 429)
    const timeSinceRateLimit = Date.now() - globalTokenCache.lastRateLimitHit;
    if (timeSinceRateLimit < RATE_LIMIT_COOLDOWN_MS && globalTokenCache.lastRateLimitHit > 0) {
      // If we have any token (even expired), try to use it
      if (globalTokenCache.accessToken) {
        console.log('[CJ API] Using cached token during rate limit cooldown');
        return globalTokenCache.accessToken;
      }
      const waitTime = Math.ceil((RATE_LIMIT_COOLDOWN_MS - timeSinceRateLimit) / 1000);
      throw new Error(`CJ API rate limited. Please wait ${waitTime} seconds before retrying.`);
    }

    // Create the token fetch promise so concurrent requests can await it
    tokenFetchPromise = this.fetchNewToken();
    
    try {
      const token = await tokenFetchPromise;
      return token;
    } finally {
      tokenFetchPromise = null;
    }
  }

  private async fetchNewToken(): Promise<string> {
    // Try refresh token first if available
    if (globalTokenCache.refreshToken && Date.now() < globalTokenCache.tokenExpiry + 14 * 24 * 3600000) {
      try {
        console.log('[CJ API] Attempting token refresh...');
        const refreshRes = await fetch(`${this.baseUrl}/authentication/refreshAccessToken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: globalTokenCache.refreshToken }),
          cache: 'no-store',
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData?.data?.accessToken) {
            const token: string = refreshData.data.accessToken;
            globalTokenCache.accessToken = token;
            globalTokenCache.refreshToken = refreshData.data.refreshToken || globalTokenCache.refreshToken;
            globalTokenCache.tokenExpiry = Date.now() + 14 * 24 * 3600000; // 14 days
            console.log('[CJ API] Token refreshed successfully');
            return token;
          }
        }
      } catch (e) {
        console.warn('[CJ API] Token refresh failed, will get new token:', e);
      }
    }

    // Get new access token
    console.log('[CJ API] Requesting new access token...');
    
    const res = await fetch(`${this.baseUrl}/authentication/getAccessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.email,
        apiKey: this.apiKey,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      // Check for rate limit error - record when we hit it
      if (res.status === 429 || text.includes('Too Many Requests') || text.includes('QPS limit')) {
        globalTokenCache.lastRateLimitHit = Date.now();
        throw new Error(`CJ API rate limited. Please wait 5 minutes before retrying. Details: ${text}`);
      }
      throw new Error(`CJ Auth failed ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (!data?.result || !data?.data?.accessToken) {
      // Check for rate limit in response body - record when we hit it
      if (data?.message?.includes('Too Many Requests') || data?.message?.includes('QPS limit')) {
        globalTokenCache.lastRateLimitHit = Date.now();
        throw new Error(`CJ API rate limited. Please wait 5 minutes before retrying.`);
      }
      throw new Error(`CJ Auth failed: ${data?.message || 'No access token returned'}`);
    }

    const token: string = data.data.accessToken;
    globalTokenCache.accessToken = token;
    globalTokenCache.refreshToken = data.data.refreshToken || null;
    globalTokenCache.tokenExpiry = Date.now() + 14 * 24 * 3600000; // 14 days
    console.log('[CJ API] New token obtained successfully');
    return token;
=======
export class CjApi {
  private appKey: string;
  private appSecret: string;
  private baseUrl: string;

  constructor(opts?: { sandbox?: boolean }) {
    this.appKey = process.env.CJ_APP_KEY || '';
    this.appSecret = process.env.CJ_APP_SECRET || '';
    this.baseUrl = (opts?.sandbox ? process.env.CJ_API_BASE_SANDBOX : process.env.CJ_API_BASE) || '';
  }

  isConfigured(): boolean {
    return !!(this.appKey && this.appSecret && this.baseUrl);
  }

  // Placeholder signing. Replace with CJ's official signature method.
  private sign(params: Record<string, any>): Record<string, any> {
    return { ...params, appKey: this.appKey, ts: Date.now() };
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  }

  async request<T>(path: string, method: HttpMethod = 'GET', body?: any): Promise<T> {
    if (!this.isConfigured()) throw new Error('CJ API not configured');
<<<<<<< HEAD
    
    const token = await this.getAccessToken();
    
    // Fix URL construction: ensure baseUrl ends with / and path doesn't start with /
    // This prevents new URL() from stripping the /api2.0/v1 path from baseUrl
    const normalizedBase = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(normalizedPath, normalizedBase);
    
    console.log(`[CJ API] Request: ${method} ${url.toString()}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'CJ-Access-Token': token,
    };

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
      cache: 'no-store',
    });

=======
    const url = new URL(path, this.baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const payload = body ? this.sign(body) : this.sign({});
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(payload),
      cache: 'no-store',
    });
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CJ API error ${res.status}: ${text}`);
    }
<<<<<<< HEAD

    return res.json() as Promise<T>;
  }

  async listServices(): Promise<any> {
    return this.request('/logistic/freightCalculate', 'POST', {});
  }

  async createOrder(payload: any): Promise<any> {
    const cjPayload = {
      orderNumber: payload.orderNo,
      shippingZip: payload.recipient?.postalCode,
      shippingCountryCode: payload.recipient?.country || 'US',
      shippingCountry: payload.recipient?.country || 'US',
      shippingProvince: payload.recipient?.state,
      shippingCity: payload.recipient?.city,
      shippingAddress: payload.recipient?.address1,
      shippingAddress2: payload.recipient?.address2 || '',
      shippingCustomerName: payload.recipient?.name,
      shippingPhone: payload.recipient?.phone,
      remark: payload.remark || '',
      logisticName: payload.logisticName || 'CJPacket Ordinary',
      fromCountryCode: 'CN',
      products: (payload.items || []).map((item: any) => ({
        vid: item.vid || item.cj_variant_id || '',
        quantity: item.quantity || 1,
      })),
    };

    // Use createOrderV2 - the original createOrder endpoint is deprecated (returns 405)
    return this.request('/shopping/order/createOrderV2', 'POST', cjPayload);
  }

  async getOrderDetail(cjOrderNo: string): Promise<any> {
    // Use orderId parameter for CJ API v2
    return this.request('/shopping/order/getOrderDetail', 'POST', { orderId: cjOrderNo });
  }

  async getTrackingInfo(cjOrderNo: string): Promise<any> {
    // Use orderId parameter for CJ API v2
    return this.request('/shopping/order/getTrackInfo', 'POST', { orderId: cjOrderNo });
  }

  /**
   * Pay for an order using CJ Wallet balance
   * This automatically deducts from your pre-funded CJ Wallet
   * 
   * @param orderId - The CJ order ID to pay for
   * @returns Payment result from CJ API
   */
  async payWithBalance(orderId: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log(`[CJ Payment] Paying order ${orderId} with wallet balance...`);
      
      // CJ's official wallet payment endpoint: /shopping/balancePayment
      const result = await this.request<any>('/shopping/balancePayment', 'POST', { 
        orderId: orderId 
      });
      
      console.log(`[CJ Payment] Response:`, JSON.stringify(result, null, 2));
      
      // Check for successful payment
      if (result?.result === true || result?.code === 200 || result?.code === '200') {
        return {
          success: true,
          message: result?.message || 'Order paid successfully',
          data: result?.data,
        };
      }
      
      // Payment failed
      return {
        success: false,
        message: result?.message || 'Payment failed - check wallet balance',
        data: result,
      };
    } catch (error: any) {
      console.error(`[CJ Payment] Error paying order ${orderId}:`, error?.message);
      return {
        success: false,
        message: error?.message || 'Payment request failed',
      };
    }
  }

  /**
   * Get CJ Wallet balance
   * @returns Current wallet balance info
   */
  async getWalletBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const result = await this.request<any>('/shopping/balance/query', 'GET');
      
      if (result?.data) {
        return {
          balance: Number(result.data.balance || result.data.amount || 0),
          currency: result.data.currency || 'USD',
        };
      }
      return null;
    } catch (error: any) {
      console.error('[CJ Wallet] Error fetching balance:', error?.message);
      return null;
    }
  }

  /**
   * Get product variants from CJ using the correct variant query endpoint
   * @param cjProductId - The CJ product ID (pid)
   * @returns List of variants with vid, sku, and size/color info for matching
   */
  async getProductVariants(cjProductId: string): Promise<{ 
    vid: string; 
    sku?: string;
    variantKey?: string;  // e.g., "Black-L" or "Black And Silver-2XL"
    variantName?: string;
    size?: string;
    color?: string;
  }[] | null> {
    try {
      console.log(`[CJ API] Fetching product variants for ${cjProductId}...`);
      
      // Use the correct variant query endpoint with pid as query parameter
      const result = await this.request<any>(`/product/variant/query?pid=${encodeURIComponent(cjProductId)}`, 'GET');
      
      console.log(`[CJ API] Variant query response structure:`, {
        code: result?.code,
        result: result?.result,
        hasData: !!result?.data,
        dataType: typeof result?.data,
        dataKeys: result?.data ? Object.keys(result.data) : [],
      });
      
      if (!result?.data) {
        console.log(`[CJ API] No variant data returned for product ${cjProductId}`);
        return null;
      }
      
      // Normalize CJ's various response formats:
      // Format 1: { data: { list: [...variants...] } } - paginated response
      // Format 2: { data: { records: [...variants...] } } - alternative pagination
      // Format 3: { data: [...variants...] } - direct array
      // Format 4: { data: { vid: "...", ... } } - single variant object
      let variants: any[] = [];
      
      if (Array.isArray(result.data)) {
        // Format 3: Direct array
        variants = result.data;
      } else if (result.data.list && Array.isArray(result.data.list)) {
        // Format 1: Paginated with 'list' key
        variants = result.data.list;
      } else if (result.data.records && Array.isArray(result.data.records)) {
        // Format 2: Paginated with 'records' key
        variants = result.data.records;
      } else if (result.data.vid || result.data.variantId) {
        // Format 4: Single variant object
        variants = [result.data];
      } else {
        console.log(`[CJ API] Unrecognized response format for product ${cjProductId}:`, JSON.stringify(result.data).slice(0, 500));
        return null;
      }
      
      const extractedVariants = variants
        .filter((v: any) => v && (v.vid || v.variantId))
        .map((v: any) => {
          const variantKey = v.variantKey || v.variantName || v.variantNameEn || '';
          
          // Parse size and color from variantKey (e.g., "Black-L" -> color="Black", size="L")
          let size: string | undefined;
          let color: string | undefined;
          
          if (variantKey && typeof variantKey === 'string') {
            const parts = variantKey.split(/[-\/]+/).map((p: string) => p.trim()).filter(Boolean);
            if (parts.length >= 2) {
              // Common sizes to identify
              const sizePatterns = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|\d+)$/i;
              for (const part of parts) {
                if (sizePatterns.test(part)) {
                  size = part;
                } else if (!color) {
                  color = part;
                }
              }
            } else if (parts.length === 1) {
              // Single value - could be size or color
              const sizePatterns = /^(XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL|6XL|\d+)$/i;
              if (sizePatterns.test(parts[0])) {
                size = parts[0];
              } else {
                color = parts[0];
              }
            }
          }
          
          return {
            vid: v.vid || v.variantId || '',
            sku: v.variantSku || v.cjSku || v.sku || '',
            variantKey,
            variantName: v.variantName || v.variantNameEn || '',
            size,
            color,
          };
        });
      
      console.log(`[CJ API] Found ${extractedVariants.length} variants with vids for product ${cjProductId}`);
      if (extractedVariants.length > 0) {
        console.log(`[CJ API] First 3 variants:`, extractedVariants.slice(0, 3).map(v => 
          `vid=${v.vid}, key="${v.variantKey}", size=${v.size}, color=${v.color}`
        ));
      }
      return extractedVariants.length > 0 ? extractedVariants : null;
    } catch (error: any) {
      console.error(`[CJ API] Error fetching variants for ${cjProductId}:`, error?.message);
      return null;
    }
  }

  /**
   * Search for a product by title and return its CJ product ID and variants
   * This is a fallback when products were not imported via CJ
   * @param title - Product title to search for
   * @returns Product info with CJ ID and variants (including size/color info for matching), or null if not found
   */
  async searchProductByTitle(title: string): Promise<{ 
    cjProductId: string; 
    variants: { vid: string; sku?: string; variantKey?: string; variantName?: string; size?: string; color?: string }[] 
  } | null> {
    try {
      // Clean up the title for search - extract key English terms
      const searchTerms = title
        .replace(/[^\w\s-]/g, ' ')  // Keep hyphens for compound words
        .split(/\s+/)
        .filter(t => t.length > 2 && /^[a-zA-Z]+$/.test(t))  // Only English words
        .slice(0, 4)  // Fewer terms for better matches
        .join(' ')
        .trim();
      
      if (!searchTerms || searchTerms.length < 3) {
        console.log(`[CJ API] Search terms too short or empty: "${searchTerms}"`);
        return null;
      }
      
      console.log(`[CJ API] Searching for product with keywords: "${searchTerms}"...`);
      
      const queryParams = new URLSearchParams({
        keyWord: searchTerms,
        page: '1',
        size: '10',
      });
      
      const result = await this.request<any>(`/product/listV2?${queryParams.toString()}`, 'GET');
      
      console.log(`[CJ API] Search response code: ${result?.code}, result: ${result?.result}`);
      
      // V2 API returns nested structure: data.content[].productList[]
      const content = result?.data?.content;
      if (!content || content.length === 0) {
        console.log(`[CJ API] No content returned for "${searchTerms}"`);
        return null;
      }
      
      const productList = content[0]?.productList;
      if (!productList || productList.length === 0) {
        console.log(`[CJ API] No products in result for "${searchTerms}"`);
        return null;
      }
      
      // Take the first matching product from the first result set
      const product = productList[0];
      const cjProductId = product.id || product.pid || '';
      const productName = product.nameEn || product.name || 'Unknown';
      
      if (!cjProductId) {
        console.log(`[CJ API] Product found but no CJ ID available`);
        return null;
      }
      
      console.log(`[CJ API] Found CJ product: ${cjProductId} - "${productName}"`);
      
      // Get variants for this product using the correct endpoint
      const variants = await this.getProductVariants(cjProductId);
      
      if (!variants || variants.length === 0) {
        console.log(`[CJ API] Product found but no variants available`);
        return null;
      }
      
      console.log(`[CJ API] Successfully retrieved ${variants.length} variants for "${productName}"`);
      
      return {
        cjProductId,
        variants,
      };
    } catch (error: any) {
      console.error(`[CJ API] Error searching for product:`, error?.message);
      return null;
    }
=======
    return res.json() as Promise<T>;
  }

  // Example endpoints (to be wired to CJ docs)
  async listServices(): Promise<any> {
    return this.request('/shipping/services', 'POST', {});
  }

  async createOrder(payload: any): Promise<any> {
    return this.request('/order/create', 'POST', payload);
  }

  async getOrderDetail(orderNo: string): Promise<any> {
    return this.request(`/order/detail?orderNo=${encodeURIComponent(orderNo)}`, 'GET');
  }

  async getTrackingInfo(orderNo: string): Promise<any> {
    return this.request(`/order/tracking?orderNo=${encodeURIComponent(orderNo)}`, 'GET');
>>>>>>> fc62bdeaefdbf0622b0b0c952aa693da1368ee80
  }
}
