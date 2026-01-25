type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

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
  }

  async request<T>(path: string, method: HttpMethod = 'GET', body?: any): Promise<T> {
    if (!this.isConfigured()) throw new Error('CJ API not configured');
    const url = new URL(path, this.baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const payload = body ? this.sign(body) : this.sign({});
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CJ API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  // Example endpoints (to be wired to CJ docs)
  async listServices(): Promise<any> {
    return this.request('/shipping/services', 'POST', {});
  }

  async createOrder(payload: any): Promise<any> {
    return this.request('/order/create', 'POST', payload);
  }
}
