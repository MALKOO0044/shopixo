import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a single Redis client from environment when available.
// In local/dev build environments without env, fall back to a permissive no-op limiter
// so builds do not crash. On Vercel, envs are present and Redis is used.
let redis: ReturnType<typeof Redis.fromEnv> | null = null;
try {
  // Only construct if both vars present
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch {
  redis = null;
}

// One-time production warning when rate limiting is disabled due to missing env
let warned = false;
if (!redis && process.env.NODE_ENV === 'production' && !warned) {
  warned = true;
  console.warn("[ratelimit] Upstash env vars are missing in production; API routes will not be rate limited.");
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const realIp = (req.headers.get("x-real-ip") || "").trim();
  return realIp || "unknown";
}

function makeLimiter(prefix: string, max: number, window: string) {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window as any),
      analytics: true,
      prefix,
    });
  }
  // No-op limiter for local build/dev without env
  return {
    async limit(_key: string) {
      return { success: true } as const;
    },
  } as unknown as Ratelimit;
}

// Sliding window: 30 req / 30s for search
export const searchLimiter = makeLimiter("rl:search", 30, "30 s");

// Uploads: 20 req / min per IP
export const uploadLimiter = makeLimiter("rl:upload", 20, "60 s");

// Cloudinary sign: 60 req / min per IP
export const signLimiter = makeLimiter("rl:sign", 60, "60 s");

// Auth endpoints (e.g., check-email): 30 req / min per IP
export const authLimiter = makeLimiter("rl:auth", 30, "60 s");
