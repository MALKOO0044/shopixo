/*
  Simple HTTP helpers with timeouts and retries.
  - fetchJson<T>(url, { timeoutMs, retries, retryStatuses })
    Throws on final non-ok. Retries on network errors and configured statuses.
*/

export type FetchJsonOptions = (RequestInit & {
  timeoutMs?: number;
  retries?: number; // total attempts = retries + 1
  retryStatuses?: number[]; // defaults: [429, 500, 502, 503, 504]
}) | undefined;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson<T = any>(url: string, options?: FetchJsonOptions): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const retries = Math.max(0, options?.retries ?? 2);
  const retryStatuses = options?.retryStatuses ?? [429, 500, 502, 503, 504];

  let lastErr: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ac.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (retryStatuses.includes(res.status) && attempt < retries) {
          const backoff = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
          await sleep(backoff);
          continue;
        }
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const text = await res.text();
      try { return JSON.parse(text) as T; } catch { return text as unknown as T; }
    } catch (e: any) {
      clearTimeout(timer);
      lastErr = e;
      const isAbort = e?.name === 'AbortError';
      const isNet = isAbort || e?.code === 'ECONNRESET' || e?.code === 'ENOTFOUND' || e?.message?.includes('network');
      if (attempt < retries && isNet) {
        const backoff = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('fetchJson failed');
}

export type FetchMetaResult<T = any> = { status: number; ok: boolean; body: T };

// fetchWithMeta: like fetchJson but returns { status, ok, body } and does not throw on non-ok responses.
export async function fetchWithMeta<T = any>(url: string, options?: FetchJsonOptions): Promise<FetchMetaResult<T>> {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const retries = Math.max(0, options?.retries ?? 2);
  const retryStatuses = options?.retryStatuses ?? [429, 500, 502, 503, 504];

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ac.signal });
      clearTimeout(timer);
      const text = await res.text().catch(() => "");
      let body: any = text;
      try { body = JSON.parse(text); } catch { /* keep text */ }
      if (!res.ok && retryStatuses.includes(res.status) && attempt < retries) {
        const backoff = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
        await sleep(backoff);
        continue;
      }
      return { status: res.status, ok: res.ok, body };
    } catch (e: any) {
      clearTimeout(timer);
      const isAbort = e?.name === 'AbortError';
      const isNet = isAbort || e?.code === 'ECONNRESET' || e?.code === 'ENOTFOUND' || e?.message?.includes('network');
      if (attempt < retries && isNet) {
        const backoff = 250 * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  // If we get here, treat as network error; keep consistent with fetchJson and throw
  throw new Error('fetchWithMeta failed');
}
