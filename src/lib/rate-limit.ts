/**
 * Public endpoint rate limiting.
 * Uses Upstash when configured; otherwise an in-memory fallback for local/dev.
 */

type LimitResult = { success: boolean; remaining: number };

const memoryHits = new Map<string, { count: number; resetAt: number }>();

async function memoryLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<LimitResult> {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt < now) {
    memoryHits.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1 };
  }
  entry.count += 1;
  if (entry.count > max) return { success: false, remaining: 0 };
  return { success: true, remaining: max - entry.count };
}

async function upstashLimit(
  ip: string,
  prefix: string,
  max: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Promise<LimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      prefix,
    });
    const result = await limiter.limit(ip);
    return { success: result.success, remaining: result.remaining };
  } catch {
    return null;
  }
}

export async function rateLimitVerification(ip: string): Promise<LimitResult> {
  return (
    (await upstashLimit(ip, "leoverify:v", 60, "1 m")) ??
    memoryLimit(`v:${ip}`, 60, 60_000)
  );
}

export async function rateLimitSignup(ip: string): Promise<LimitResult> {
  return (
    (await upstashLimit(ip, "leoverify:signup", 10, "1 m")) ??
    memoryLimit(`signup:${ip}`, 10, 60_000)
  );
}

export async function rateLimitBadge(ip: string): Promise<LimitResult> {
  return (
    (await upstashLimit(ip, "leoverify:badge", 60, "1 m")) ??
    memoryLimit(`badge:${ip}`, 60, 60_000)
  );
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
