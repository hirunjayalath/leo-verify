/**
 * Public verification rate limiting.
 * Uses Upstash when configured; otherwise an in-memory fallback for local/dev.
 */

type LimitResult = { success: boolean; remaining: number };

const memoryHits = new Map<string, { count: number; resetAt: number }>();

async function memoryLimit(ip: string): Promise<LimitResult> {
  const windowMs = 60_000;
  const max = 60;
  const now = Date.now();
  const entry = memoryHits.get(ip);
  if (!entry || entry.resetAt < now) {
    memoryHits.set(ip, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1 };
  }
  entry.count += 1;
  if (entry.count > max) return { success: false, remaining: 0 };
  return { success: true, remaining: max - entry.count };
}

export async function rateLimitVerification(ip: string): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return memoryLimit(ip);
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "leoverify:v",
    });
    const result = await limiter.limit(ip);
    return { success: result.success, remaining: result.remaining };
  } catch {
    return memoryLimit(ip);
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
