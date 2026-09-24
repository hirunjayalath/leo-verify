import { describe, expect, it } from "vitest";
import { isAuthDevBypassEnabled, isUomPlatformAdmin } from "@/lib/auth";
import { resolveSessionLookup } from "@/lib/auth-redirect";

describe("isAuthDevBypassEnabled", () => {
  it("is false when AUTH_DEV_BYPASS is unset", () => {
    expect(
      isAuthDevBypassEnabled({
        NODE_ENV: "development",
      }),
    ).toBe(false);
  });

  it("is true only in local development with AUTH_DEV_BYPASS=true", () => {
    expect(
      isAuthDevBypassEnabled({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "development",
      }),
    ).toBe(true);
  });

  it("ignores AUTH_DEV_BYPASS outside development", () => {
    expect(
      isAuthDevBypassEnabled({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "production",
      }),
    ).toBe(false);

    expect(
      isAuthDevBypassEnabled({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "test",
      }),
    ).toBe(false);
  });

  it("refuses bypass on Vercel even if NODE_ENV is development", () => {
    expect(
      isAuthDevBypassEnabled({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "development",
        VERCEL: "1",
      }),
    ).toBe(false);

    expect(
      isAuthDevBypassEnabled({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "development",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
  });
});

describe("isUomPlatformAdmin", () => {
  it("is only the UOM club admin", () => {
    expect(
      isUomPlatformAdmin({ role: "club_admin", club: { code: "UOM" } }),
    ).toBe(true);
    expect(
      isUomPlatformAdmin({ role: "district_admin", club: { code: "UOM" } }),
    ).toBe(false);
    expect(
      isUomPlatformAdmin({ role: "club_admin", club: { code: "OTHER" } }),
    ).toBe(false);
  });
});

describe("session lookup", () => {
  it("never falls back to the seed admin", () => {
    expect(isAuthDevBypassEnabled({ AUTH_DEV_BYPASS: "true", NODE_ENV: "development" })).toBe(
      true,
    );
    expect(
      resolveSessionLookup({
        authSupabaseId: null,
      }),
    ).toBeNull();
    expect(
      resolveSessionLookup({
        authSupabaseId: "signed-in-district-admin",
      }),
    ).toEqual({
      source: "session",
      supabaseId: "signed-in-district-admin",
    });
  });
});
