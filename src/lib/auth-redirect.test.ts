import { describe, expect, it } from "vitest";
import {
  continueHref,
  homePathForRole,
  isPathAllowedForRole,
  postLoginPath,
  resolveSessionLookup,
} from "@/lib/auth-redirect";

describe("homePathForRole", () => {
  it("sends each role to its dashboard", () => {
    expect(homePathForRole("club_admin")).toBe("/admin");
    expect(homePathForRole("district_admin")).toBe("/admin/district");
    expect(homePathForRole(null)).toBe("/claim");
    expect(homePathForRole(undefined)).toBe("/claim");
  });
});

describe("postLoginPath", () => {
  it("honors safe admin next for club and district admins", () => {
    expect(postLoginPath("club_admin", "/admin/certificates")).toBe(
      "/admin/certificates",
    );
    expect(postLoginPath("district_admin", "/admin/district")).toBe(
      "/admin/district",
    );
  });

  it("ignores admin next for recipients", () => {
    expect(postLoginPath(null, "/admin")).toBe("/claim");
    expect(postLoginPath(null, "/admin/certificates")).toBe("/claim");
    expect(postLoginPath(null, "/claim")).toBe("/claim");
  });

  it("ignores claim next for admins", () => {
    expect(postLoginPath("club_admin", "/claim")).toBe("/admin");
    expect(postLoginPath("district_admin", "/claim")).toBe("/admin/district");
  });

  it("rejects open redirects", () => {
    expect(postLoginPath("club_admin", "//evil.com")).toBe("/admin");
    expect(postLoginPath(null, "https://evil.com")).toBe("/claim");
  });
});

describe("isPathAllowedForRole", () => {
  it("keeps recipients off /admin", () => {
    expect(isPathAllowedForRole(null, "/admin")).toBe(false);
    expect(isPathAllowedForRole("club_admin", "/admin")).toBe(true);
    expect(isPathAllowedForRole(null, "/faq")).toBe(true);
  });
});

describe("continueHref", () => {
  it("omits next when missing or unsafe", () => {
    expect(continueHref(null)).toBe("/continue");
    expect(continueHref("//evil.com")).toBe("/continue");
  });

  it("forwards a safe next", () => {
    expect(continueHref("/admin/certificates")).toBe(
      "/continue?next=%2Fadmin%2Fcertificates",
    );
  });
});

describe("resolveSessionLookup", () => {
  it("prefers a real Auth session over bypass", () => {
    expect(
      resolveSessionLookup({
        bypassEnabled: true,
        authSupabaseId: "auth-user-id",
        seedAdminSupabaseId: "seed-admin-id",
      }),
    ).toEqual({ source: "session", supabaseId: "auth-user-id" });
  });

  it("falls back to the seed admin only when nobody is signed in", () => {
    expect(
      resolveSessionLookup({
        bypassEnabled: true,
        authSupabaseId: null,
        seedAdminSupabaseId: "seed-admin-id",
      }),
    ).toEqual({ source: "bypass", supabaseId: "seed-admin-id" });
  });

  it("does not use bypass when it is disabled", () => {
    expect(
      resolveSessionLookup({
        bypassEnabled: false,
        authSupabaseId: null,
        seedAdminSupabaseId: "seed-admin-id",
      }),
    ).toBeNull();
  });
});
