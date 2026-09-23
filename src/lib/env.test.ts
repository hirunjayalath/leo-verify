import { describe, expect, it } from "vitest";
import { assertProductionEnv, isProductionEnvContract } from "@/lib/env";

const HMAC = "test-hmac-secret-at-least-32-characters-long";

function completeProductionEnv(
  overrides: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://postgres:pass@db.example.com:6543/postgres",
    DIRECT_DATABASE_URL:
      "postgresql://postgres:pass@db.example.com:5432/postgres",
    SERVICE_DATABASE_URL:
      "postgresql://leoverify_service:pass@db.example.com:6543/postgres",
    CERT_HMAC_SECRET: HMAC,
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    NEXT_PUBLIC_APP_URL: "https://leoverify.example",
    R2_ACCOUNT_ID: "account",
    R2_ACCESS_KEY_ID: "access",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET_NAME: "leoverify",
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "LeoVerify <certificates@leoverify.org>",
    INNGEST_EVENT_KEY: "event-key",
    INNGEST_SIGNING_KEY: "signing-key",
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    ...overrides,
  };
}

describe("production environment contract", () => {
  it("treats NODE_ENV=production and VERCEL as production", () => {
    expect(isProductionEnvContract({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionEnvContract({ VERCEL: "1" })).toBe(true);
    expect(isProductionEnvContract({ NODE_ENV: "development" })).toBe(false);
    expect(isProductionEnvContract({ NODE_ENV: "test" })).toBe(false);
  });

  it("does not throw for a development-shaped env", () => {
    expect(() =>
      assertProductionEnv({
        NODE_ENV: "development",
        CERT_HMAC_SECRET: HMAC,
      }),
    ).not.toThrow();
  });

  it("does not throw for a complete production env", () => {
    expect(() => assertProductionEnv(completeProductionEnv())).not.toThrow();
  });

  it("fails a production env missing Upstash or R2 and names both keys", () => {
    expect(() =>
      assertProductionEnv(
        completeProductionEnv({
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          R2_ACCOUNT_ID: "",
          R2_ACCESS_KEY_ID: "",
          R2_SECRET_ACCESS_KEY: "",
          R2_BUCKET_NAME: "",
        }),
      ),
    ).toThrow(/UPSTASH_REDIS_REST_URL/);

    try {
      assertProductionEnv(
        completeProductionEnv({
          UPSTASH_REDIS_REST_URL: "",
          R2_ACCOUNT_ID: "",
        }),
      );
      expect.unreachable("expected production env to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      expect(message).toContain("UPSTASH_REDIS_REST_URL");
      expect(message).toContain("R2_ACCOUNT_ID");
    }
  });

  it("rejects AUTH_DEV_BYPASS=true in production", () => {
    expect(() =>
      assertProductionEnv(
        completeProductionEnv({ AUTH_DEV_BYPASS: "true" }),
      ),
    ).toThrow(/AUTH_DEV_BYPASS/);
  });
});
