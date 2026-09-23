import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  withRlsContext: async (
    _id: string,
    fn: (tx: unknown) => Promise<unknown>,
  ) => fn({}),
  prisma: {
    recipient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    certificate: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { CertificateStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  claimCertificates,
  getRecipientDashboardData,
  updateProfileVisibility,
} from "@/lib/recipients/service";

describe("recipients service", () => {
  beforeEach(() => {
    vi.mocked(prisma.recipient.findUnique).mockReset();
    vi.mocked(prisma.recipient.findFirst).mockReset();
    vi.mocked(prisma.recipient.create).mockReset();
    vi.mocked(prisma.recipient.update).mockReset();
    vi.mocked(prisma.certificate.updateMany).mockReset();
    vi.mocked(prisma.certificate.findMany).mockReset();
  });

  it("rejects claim when form email does not match session", async () => {
    const result = await claimCertificates({
      auth: { id: "auth-1", email: "signed-in@test.local" },
      email: "other@test.local",
      name: "Other",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/same email/i);
  });

  it("rejects claim that would steal an already-bound supabaseId", async () => {
    vi.mocked(prisma.recipient.findUnique).mockResolvedValue({
      id: "r1",
      email: "person@test.local",
      supabaseId: "owner-auth",
      slug: "person",
      publicProfile: false,
    } as never);

    const result = await claimCertificates({
      auth: { id: "attacker-auth", email: "person@test.local" },
      email: "person@test.local",
      name: "Person",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already claimed/i);
  });

  it("creates recipients with publicProfile false by default", async () => {
    vi.mocked(prisma.recipient.findUnique).mockImplementation((async (args: {
      where: { email?: string; slug?: string };
    }) => {
      if (args.where.email) return null;
      if (args.where.slug) return null;
      return null;
    }) as never);
    vi.mocked(prisma.recipient.create).mockResolvedValue({
      id: "r-new",
      email: "new@test.local",
      slug: "new",
      publicProfile: false,
      supabaseId: "auth-new",
    } as never);
    vi.mocked(prisma.certificate.updateMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.certificate.findMany).mockResolvedValue([]);

    const result = await claimCertificates({
      auth: { id: "auth-new", email: "new@test.local" },
      email: "new@test.local",
      name: "New Person",
    });

    expect(result.ok).toBe(true);
    expect(prisma.recipient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publicProfile: false,
          supabaseId: "auth-new",
        }),
      }),
    );
  });

  it("does not crash when Event include is null under RLS", async () => {
    process.env.CERT_HMAC_SECRET =
      process.env.CERT_HMAC_SECRET ||
      "test-hmac-secret-at-least-32-characters-long";

    vi.mocked(prisma.recipient.findFirst).mockResolvedValue({
      id: "r1",
      email: "person@test.local",
      name: "Person",
      slug: "person",
      publicProfile: false,
      certificates: [
        {
          id: "c1",
          uniqueId: "LEO-UOM-2026-000123",
          recipientName: "Person",
          eventId: "evt_1",
          clubId: "club_1",
          issueDate: new Date("2026-03-15"),
          role: "Volunteer",
          tokenVersion: 1,
          pdfKey: null,
          pdfUrl: null,
          status: CertificateStatus.issued,
          unlisted: false,
          event: null,
        },
      ],
    } as never);

    const result = await getRecipientDashboardData({
      id: "auth-1",
      email: "person@test.local",
    });

    expect(result.recipient).not.toBeNull();
    expect(result.recipient?.certificates).toEqual([
      expect.objectContaining({
        id: "c1",
        uniqueId: "LEO-UOM-2026-000123",
        eventName: "Certificate",
      }),
    ]);
  });

  it("refuses visibility update when supabaseId does not match", async () => {
    vi.mocked(prisma.recipient.findFirst).mockResolvedValue({
      id: "r1",
      supabaseId: "owner-auth",
      slug: "person",
      publicProfile: false,
    } as never);

    const result = await updateProfileVisibility({
      auth: { id: "other-auth", email: "person@test.local" },
      publicProfile: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not authorized/i);
  });
});
