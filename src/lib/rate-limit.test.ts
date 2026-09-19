import { describe, expect, it, afterEach } from "vitest";
import {
  clientIpFromHeaders,
  isProductionRuntime,
  rateLimitExpensiveRender,
  rateLimitVerification,
} from "@/lib/rate-limit";

describe("rate limit smoke", () => {
  const saved = {
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
    vercel: process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
  };

  afterEach(() => {
    if (saved.upstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = saved.upstashUrl;
    if (saved.upstashToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = saved.upstashToken;
    }
    if (saved.vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = saved.vercel;
    if (saved.vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = saved.vercelEnv;
  });

  it("extracts client IP from forwarded headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("allows first verification requests via memory fallback outside production", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    const result = await rateLimitVerification(`test-ip-${Date.now()}`);
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("fails closed when Upstash is missing in production runtime", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.VERCEL = "1";
    expect(isProductionRuntime()).toBe(true);
    const result = await rateLimitVerification(`prod-ip-${Date.now()}`);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("applies stricter expensive-render limit key outside production", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    const result = await rateLimitExpensiveRender(`render-ip-${Date.now()}`);
    expect(result.success).toBe(true);
  });
});
