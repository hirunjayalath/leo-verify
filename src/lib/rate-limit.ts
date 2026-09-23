type LimitResult = { success: boolean; remaining: number };

const memoryHits = new Map<string, { count: number; resetAt: number }>();

type RedisLike = { url: string; token: string };
let cachedCreds: RedisLike | null = null;
let redisClient: import("@upstash/redis").Redis | null = null;
const limiterCache = new Map<
  string,
  import("@upstash/ratelimit").Ratelimit
>();

function isProductionRuntime(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.VERCEL || env.VERCEL_ENV || env.NODE_ENV === "production");
}

function upstashCreds(): RedisLike | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function getLimiter(
  prefix: string,
  max: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
) {
  const creds = upstashCreds();
  if (!creds) return null;
  if (
    !cachedCreds ||
    cachedCreds.url !== creds.url ||
    cachedCreds.token !== creds.token
  ) {
    cachedCreds = creds;
    redisClient = null;
    limiterCache.clear();
  }
  const cacheKey = `${prefix}:${max}:${window}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");
  redisClient ??= new Redis({ url: creds.url, token: creds.token });
  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
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
  try {
    const limiter = await getLimiter(prefix, max, window);
    if (!limiter) return null;
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
  if (isProductionRuntime() && ip === "unknown") {
    return { success: false, remaining: 0 };
  }

  const upstash = await upstashLimit(ip, prefix, max, window);
  if (upstash) return upstash;

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

/** Prefer platform IP. Do not trust client-supplied X-Forwarded-For in production. */
export function clientIpFromHeaders(headers: Headers): string {
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  if (isProductionRuntime()) return "unknown";
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export { isProductionRuntime };
