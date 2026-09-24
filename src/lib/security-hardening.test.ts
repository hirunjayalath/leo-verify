import { describe, expect, it, vi } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fetchBackgroundBytes } from "@/lib/certificates/safe-fetch";

describe("fetchBackgroundBytes", () => {
  it("rejects path traversal via /uploads/..", async () => {
    await expect(
      fetchBackgroundBytes("/uploads/../../.env"),
    ).rejects.toThrow(/invalid local upload path/i);
  });

  it("rejects gallery path traversal and nested paths", async () => {
    await expect(
      fetchBackgroundBytes("/template-gallery/../.env"),
    ).rejects.toThrow(/invalid local gallery path/i);
    await expect(
      fetchBackgroundBytes("/template-gallery/nested/bg.png"),
    ).rejects.toThrow(/invalid local gallery path/i);
  });

  it("reads a bundled gallery PNG", async () => {
    const bytes = await fetchBackgroundBytes("/template-gallery/completion.png");
    expect(bytes.byteLength).toBeGreaterThan(50_000);
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
    expect(bytes[2]).toBe(0x4e);
    expect(bytes[3]).toBe(0x47);
  });

  it("rejects non-allowlisted remote hosts (SSRF)", async () => {
    await expect(
      fetchBackgroundBytes("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toThrow(/not allowlisted/i);
  });

  it("rejects arbitrary https hosts", async () => {
    await expect(
      fetchBackgroundBytes("https://evil.example/bg.png"),
    ).rejects.toThrow(/not allowlisted/i);
  });
});

describe("template gallery artwork", () => {
  it("ships two A4-landscape certificate backgrounds", () => {
    const dir = join(process.cwd(), "public", "template-gallery");
    for (const name of ["completion.png", "appreciation.png"]) {
      const file = join(dir, name);
      expect(statSync(file).size).toBeGreaterThan(50_000);
      const header = readFileSync(file).subarray(16, 24);
      expect(header.readUInt32BE(0)).toBe(1684);
      expect(header.readUInt32BE(4)).toBe(1190);
    }
  });
});

describe("safeInternalPath", () => {
  it("rejects protocol-relative open redirects", async () => {
    const { safeInternalPath } = await import("@/lib/safe-redirect");
    expect(safeInternalPath("//evil.com")).toBe("/admin");
    expect(safeInternalPath("/\\evil.com")).toBe("/admin");
    expect(safeInternalPath("https://evil.com")).toBe("/admin");
    expect(safeInternalPath("/admin/certificates")).toBe("/admin/certificates");
  });
});

describe("email HTML escape", () => {
  it("escapes script tags in certificate email HTML", async () => {
    const { buildCertificateEmailHtml } = await import("@/lib/email/resend");
    const html = buildCertificateEmailHtml({
      recipientName: `<script>alert(1)</script>`,
      uniqueId: "LEO-UOM-2026-000001",
      verificationToken: "abc",
      eventName: `Evt<img src=x onerror=alert(1)>`,
      clubName: `Club" onclick="alert(1)`,
      appBaseUrl: "https://app.example",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});

describe("requireEmailSent", () => {
  it("throws when the provider reports a failed send", async () => {
    const { requireEmailSent } = await import("@/lib/email/resend");
    expect(() =>
      requireEmailSent({ sent: false, error: "Resend 429" }),
    ).toThrow(/Resend 429/);
  });

  it("does not throw when email was skipped because no API key", async () => {
    const { requireEmailSent } = await import("@/lib/email/resend");
    expect(
      requireEmailSent({ sent: false, skipped: true, error: "not configured" }),
    ).toMatchObject({ skipped: true });
  });
});

// silence unused vi import warning in some configs
void vi;
