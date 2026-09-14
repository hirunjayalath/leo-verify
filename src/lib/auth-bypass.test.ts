import { describe, expect, it } from "vitest";
import { isAuthDevBypassEnabled } from "@/lib/auth";

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
