const CJ_REQUEST_INTERVAL_MS = 1100;

let lastRequestTime = 0;

export async function throttleCjRequest<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const waitTime = Math.max(0, CJ_REQUEST_INTERVAL_MS - elapsed);
  
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return fn();
}
