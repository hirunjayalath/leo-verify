import { describe, expect, it, vi } from "vitest";
import { fetchBackgroundBytes } from "@/lib/certificates/safe-fetch";

describe("fetchBackgroundBytes", () => {
  it("rejects path traversal via /uploads/..", async () => {
    await expect(
      fetchBackgroundBytes("/uploads/../../.env"),
    ).rejects.toThrow(/invalid local upload path/i);
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

// silence unused vi import warning in some configs
void vi;
