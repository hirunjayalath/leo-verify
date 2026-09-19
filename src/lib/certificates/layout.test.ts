import { describe, expect, it } from "vitest";
import {
  isSignatureField,
  templateLayoutSchema,
} from "@/lib/certificates/layout";
import { renderCertificatePdf } from "@/lib/certificates/render-pdf";

describe("layout signature fields", () => {
  it("parses signature overlay fields with imageUrl", () => {
    const parsed = templateLayoutSchema.safeParse([
      {
        field: "signature1",
        x: 120,
        y: 420,
        width: 140,
        height: 60,
        imageUrl: "https://cdn.example.com/sig1.png",
      },
      {
        field: "signature2",
        x: 520,
        y: 420,
        width: 140,
        height: 60,
      },
    ]);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(isSignatureField(parsed.data[0].field)).toBe(true);
      expect(parsed.data[0].imageUrl).toBe("https://cdn.example.com/sig1.png");
      expect(parsed.data[1].imageUrl).toBeUndefined();
    }
  });

  it("still accepts layouts without signatures", () => {
    const parsed = templateLayoutSchema.safeParse([
      {
        field: "recipientName",
        x: 100,
        y: 100,
        fontSize: 18,
      },
      { field: "qr", x: 400, y: 400, width: 80, height: 80 },
    ]);
    expect(parsed.success).toBe(true);
  });
});

describe("renderCertificatePdf signatures", () => {
  it("renders without throwing when a signature PNG overlay is present", async () => {
    // 1x1 PNG
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("sig.png") || url.includes("bg.png")) {
        return new Response(png, { status: 200, headers: { "content-type": "image/png" } });
      }
      return previousFetch(input);
    }) as typeof fetch;

    try {
      const bytes = await renderCertificatePdf({
        backgroundUrl: "https://cdn.example.com/bg.png",
        layout: [
          {
            field: "recipientName",
            x: 297,
            y: 280,
            fontSize: 18,
            align: "center",
          },
          {
            field: "signature1",
            x: 120,
            y: 420,
            width: 140,
            height: 60,
            imageUrl: "https://cdn.example.com/sig.png",
          },
        ],
        recipientName: "Ada Lovelace",
        role: "Volunteer",
        issueDate: "2026-09-19",
        uniqueId: "LEO-UOM-2026-000001",
        verificationToken: "abc",
        appBaseUrl: "https://leoverify.test",
      });
      expect(bytes.byteLength).toBeGreaterThan(100);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
