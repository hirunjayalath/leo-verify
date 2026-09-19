import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    certificate: {
      findUnique: vi.fn(),
    },
  },
}));

import { CertificateStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getVerifiedShareCard } from "@/lib/certificates/verify-lookup";
import { computeVerificationToken } from "@/lib/certificates/token";

describe("getVerifiedShareCard", () => {
  beforeEach(() => {
    vi.mocked(prisma.certificate.findUnique).mockReset();
    process.env.CERT_HMAC_SECRET =
      process.env.CERT_HMAC_SECRET ||
      "test-secret-at-least-32-characters-long!!";
  });

  it("returns null without a token", async () => {
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      uniqueId: "LEO-UOM-2026-1",
      verificationToken: "x",
      recipientName: "Ada",
      role: "Volunteer",
      achievement: null,
      issueDate: new Date("2026-01-01"),
      status: CertificateStatus.issued,
      clubId: "club",
      eventId: "event",
      pdfUrl: null,
      pdfKey: null,
      tokenVersion: 1,
      event: { name: "Event", club: { name: "Club" } },
    } as never);

    expect(await getVerifiedShareCard("LEO-UOM-2026-1", null)).toBeNull();
  });

  it("returns share fields for a valid issued certificate", async () => {
    const fields = {
      uniqueId: "LEO-UOM-2026-1",
      recipientName: "Ada Lovelace",
      eventId: "event",
      clubId: "club",
      issueDate: "2026-01-01",
      role: "Volunteer",
      tokenVersion: 1,
    };
    const token = computeVerificationToken(fields);
    vi.mocked(prisma.certificate.findUnique).mockResolvedValue({
      uniqueId: fields.uniqueId,
      verificationToken: token,
      recipientName: fields.recipientName,
      role: fields.role,
      achievement: null,
      issueDate: new Date(fields.issueDate),
      status: CertificateStatus.issued,
      clubId: fields.clubId,
      eventId: fields.eventId,
      pdfUrl: null,
      pdfKey: null,
      tokenVersion: 1,
      event: { name: "Hackathon", club: { name: "Leo UoM" } },
    } as never);

    const card = await getVerifiedShareCard(fields.uniqueId, token);
    expect(card).toEqual({
      recipientName: "Ada Lovelace",
      eventName: "Hackathon",
      clubName: "Leo UoM",
      role: "Volunteer",
      issueDate: "2026-01-01",
      uniqueId: "LEO-UOM-2026-1",
    });
  });
});
