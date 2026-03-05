type CounterStore = Map<string, number>;
const processWideCounters: CounterStore = new Map();

type CounterStorage = {
  getStore(): CounterStore | undefined;
  run<T>(store: CounterStore, callback: () => Promise<T>): Promise<T>;
};

declare const require:
  | ((id: string) => any)
  | undefined;

let requestCounterStorage: CounterStorage | null = null;
try {
  const req = typeof require === 'function' ? require : undefined;
  if (req) {
    const asyncHooks = (() => {
      try {
        return req('node:async_hooks');
      } catch {
        try {
          return req('async_hooks');
        } catch {
          return null;
        }
      }
    })();

    const AsyncLocalStorageCtor = asyncHooks?.AsyncLocalStorage;
    if (typeof AsyncLocalStorageCtor === 'function') {
      requestCounterStorage = new AsyncLocalStorageCtor() as CounterStorage;
    }
  }
} catch {
  requestCounterStorage = null;
}

function sanitizeCounterName(name: string): string {
  return String(name || '').trim();
}

function normalizeCounterValue(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function getActiveStore(): CounterStore {
  return requestCounterStorage?.getStore() || processWideCounters;
}

export async function withRequestCounters<T>(
  task: () => Promise<T>,
  seed?: Record<string, number>
): Promise<T> {
  const initialStore: CounterStore = new Map();

  if (seed && typeof seed === 'object') {
    for (const [key, value] of Object.entries(seed)) {
      const normalizedKey = sanitizeCounterName(key);
      if (!normalizedKey) continue;
      initialStore.set(normalizedKey, normalizeCounterValue(value));
    }
  }

  if (requestCounterStorage) {
    return requestCounterStorage.run(initialStore, task);
  }

  const previousStore = new Map(processWideCounters);
  processWideCounters.clear();
  for (const [key, value] of initialStore.entries()) {
    processWideCounters.set(key, value);
  }

  try {
    return await task();
  } finally {
    processWideCounters.clear();
    for (const [key, value] of previousStore.entries()) {
      processWideCounters.set(key, value);
    }
  }
}

export function incrementRequestCounter(name: string, delta: number = 1): number {
  const normalizedName = sanitizeCounterName(name);
  if (!normalizedName) return 0;

  const incrementBy = Number.isFinite(delta) ? Math.max(1, Math.floor(delta)) : 1;
  const store = getActiveStore();
  const current = store.get(normalizedName) || 0;
  const next = current + incrementBy;
  store.set(normalizedName, next);
  return next;
}

export function getRequestCounter(name: string): number {
  const normalizedName = sanitizeCounterName(name);
  if (!normalizedName) return 0;

  const store = getActiveStore();
  return store.get(normalizedName) || 0;
}

export function getRequestCountersSnapshot(): Record<string, number> {
  const store = getActiveStore();
  const snapshot: Record<string, number> = {};

  for (const [key, value] of store.entries()) {
    snapshot[key] = normalizeCounterValue(value);
  }

  return snapshot;
}

export function diffCounterSnapshots(
  before: Record<string, number> | null | undefined,
  after: Record<string, number> | null | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set<string>([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of keys) {
    const beforeValue = normalizeCounterValue(before?.[key]);
    const afterValue = normalizeCounterValue(after?.[key]);
    const delta = afterValue - beforeValue;
    if (delta > 0) {
      out[key] = delta;
    }
  }

  return out;
}
