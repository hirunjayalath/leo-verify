import { describe, expect, it } from "vitest";
import {
  clientIpFromHeaders,
  rateLimitVerification,
} from "@/lib/rate-limit";

describe("rate limit smoke", () => {
  it("extracts client IP from forwarded headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    expect(clientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("allows first verification requests via memory fallback", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const result = await rateLimitVerification(`test-ip-${Date.now()}`);
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });
});
