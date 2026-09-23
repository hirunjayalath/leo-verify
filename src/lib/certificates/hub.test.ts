import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    certificate: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: "https://app.example" }),
}));

vi.mock("@/lib/email/resend", () => ({
  resendCertificateEmail: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { buildPdfZipManifest, exportVerifyUrlsCsv } from "@/lib/certificates/hub";

describe("exportVerifyUrlsCsv", () => {
  beforeEach(() => {
    vi.mocked(prisma.certificate.findMany).mockReset();
  });

  it("pages results instead of one large query", async () => {
    vi.mocked(prisma.certificate.findMany)
      .mockResolvedValueOnce(
        Array.from({ length: 500 }, (_, i) => ({
          id: `id-${i}`,
          uniqueId: `LEO-UOM-2026-${String(i + 1).padStart(6, "0")}`,
          recipientName: "Ada",
          recipientEmail: null,
          verificationToken: "tok",
          createdAt: new Date(),
        })) as never,
      )
      .mockResolvedValueOnce([]);

    const result = await exportVerifyUrlsCsv({ clubId: "club-1" });
    expect(result.count).toBe(500);
    expect(prisma.certificate.findMany).toHaveBeenCalledTimes(2);
    expect(vi.mocked(prisma.certificate.findMany).mock.calls[0]![0]).toMatchObject({
      take: 500,
    });
  });
});

describe("buildPdfZipManifest", () => {
  beforeEach(() => {
    vi.mocked(prisma.certificate.findMany).mockReset();
  });

  it("uses token-gated app URLs without signing R2 objects", async () => {
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([
      {
        uniqueId: "LEO-UOM-2026-000001",
        verificationToken: "tok",
      },
    ] as never);

    const result = await buildPdfZipManifest({ clubId: "club-1" });
    expect(result.files[0]?.url).toMatch(
      /^https:\/\/app\.example\/api\/certificates\/LEO-UOM-2026-000001\/pdf\?t=/,
    );
  });
});
