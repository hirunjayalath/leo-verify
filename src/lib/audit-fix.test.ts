import { describe, expect, it } from "vitest";
import { sniffImageBytes } from "@/lib/certificates/image-sniff";
import { safeInternalPath } from "@/lib/safe-redirect";

describe("image sniff (reject WebP)", () => {
  it("accepts PNG magic bytes", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]);
    expect(sniffImageBytes(png)).toEqual({
      ok: true,
      ext: "png",
      contentType: "image/png",
    });
  });

  it("rejects WebP because pdf-lib cannot embed it", () => {
    const webp = Buffer.alloc(12);
    webp[0] = 0x52;
    webp[1] = 0x49;
    webp[2] = 0x46;
    webp[3] = 0x46;
    webp[8] = 0x57;
    webp[9] = 0x45;
    webp[10] = 0x42;
    webp[11] = 0x50;
    const result = sniffImageBytes(webp);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/WebP/i);
    }
  });
});

describe("proxy next path handling", () => {
  it("honors safe /claim next for recipient login bounce", () => {
    expect(safeInternalPath("/claim", "/admin")).toBe("/claim");
    expect(safeInternalPath("/admin/certificates", "/admin")).toBe(
      "/admin/certificates",
    );
  });

  it("falls back when next is missing or unsafe", () => {
    expect(safeInternalPath(null, "/admin")).toBe("/admin");
    expect(safeInternalPath("//evil", "/admin")).toBe("/admin");
  });
});
