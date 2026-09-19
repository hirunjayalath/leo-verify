type LimitResult = { success: boolean; remaining: number };

const memoryHits = new Map<string, { count: number; resetAt: number }>();

function isProductionRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.VERCEL || env.VERCEL_ENV || env.NODE_ENV === "production");
}

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

async function limitOrFailClosed(
  ip: string,
  prefix: string,
  max: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
  memoryKey: string,
  windowMs: number,
): Promise<LimitResult> {
  const upstash = await upstashLimit(ip, prefix, max, window);
  if (upstash) return upstash;

  // Fail closed on Vercel when Upstash is missing or broken.
  if (isProductionRuntime()) {
    return { success: false, remaining: 0 };
  }

  return memoryLimit(memoryKey, max, windowMs);
}

export async function rateLimitVerification(ip: string): Promise<LimitResult> {
  return limitOrFailClosed(ip, "leoverify:v", 60, "1 m", `v:${ip}`, 60_000);
}

export async function rateLimitSignup(ip: string): Promise<LimitResult> {
  return limitOrFailClosed(
    ip,
    "leoverify:signup",
    10,
    "1 m",
    `signup:${ip}`,
    60_000,
  );
}

export async function rateLimitBadge(ip: string): Promise<LimitResult> {
  return limitOrFailClosed(
    ip,
    "leoverify:badge",
    60,
    "1 m",
    `badge:${ip}`,
    60_000,
  );
}

export async function rateLimitExpensiveRender(
  ip: string,
): Promise<LimitResult> {
  return limitOrFailClosed(
    ip,
    "leoverify:render",
    20,
    "1 m",
    `render:${ip}`,
    60_000,
  );
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

export { isProductionRuntime };
