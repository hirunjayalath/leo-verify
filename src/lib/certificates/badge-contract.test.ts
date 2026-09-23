import { describe, expect, it } from "vitest";
import { isBadgeExportAllowed } from "@/lib/certificates/badge-access";

describe("badge export access", () => {
  it("denies missing, revoked, and token-less requests the same way", () => {
    expect(
      isBadgeExportAllowed({ issued: false, token: "tok", tokenValid: true }),
    ).toBe(false);
    expect(
      isBadgeExportAllowed({ issued: true, token: null, tokenValid: false }),
    ).toBe(false);
    expect(
      isBadgeExportAllowed({ issued: true, token: "bad", tokenValid: false }),
    ).toBe(false);
  });

  it("allows only an issued certificate with a valid token", () => {
    expect(
      isBadgeExportAllowed({ issued: true, token: "tok", tokenValid: true }),
    ).toBe(true);
  });
});
