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
  getServerEnv: () => ({
    CERT_HMAC_SECRET: "test-hmac-secret-at-least-32-characters-long",
  }),
}));

vi.mock("@/lib/email/resend", () => ({
  resendCertificateEmail: vi.fn(),
}));

import { prisma } from "@/lib/db";
import {
  buildPdfZipManifest,
  csvSeekWhere,
  exportVerifyUrlsCsv,
} from "@/lib/certificates/hub";

describe("exportVerifyUrlsCsv", () => {
  process.env.CERT_HMAC_SECRET =
    process.env.CERT_HMAC_SECRET ||
    "test-hmac-secret-at-least-32-characters-long";
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
          eventId: "event-1",
          clubId: "club-1",
          issueDate: new Date("2026-01-01"),
          role: "Volunteer",
          tokenVersion: 1,
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
    const secondWhere = vi.mocked(prisma.certificate.findMany).mock.calls[1]![0]
      ?.where as { OR?: unknown };
    expect(secondWhere.OR).toBeDefined();
  });

  it("seeks the next page by createdAt then id", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    expect(csvSeekWhere({ createdAt, id: "id-9" })).toEqual({
      OR: [
        { createdAt: { lt: createdAt } },
        { AND: [{ createdAt }, { id: { lt: "id-9" } }] },
      ],
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
        recipientName: "Ada",
        eventId: "event-1",
        clubId: "club-1",
        issueDate: new Date("2026-01-01"),
        role: "Volunteer",
        tokenVersion: 1,
      },
    ] as never);

    const result = await buildPdfZipManifest({ clubId: "club-1" });
    expect(result.files[0]?.url).toMatch(
      /^https:\/\/app\.example\/api\/certificates\/LEO-UOM-2026-000001\/pdf\?t=/,
    );
  });
});
