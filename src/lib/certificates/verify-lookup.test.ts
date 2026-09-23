import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prismaService: {
    certificate: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitVerification: vi.fn(),
}));

import { CertificateStatus } from "@/generated/prisma/client";
import { prismaService } from "@/lib/db";
import { rateLimitVerification } from "@/lib/rate-limit";
import {
  getVerifiedShareCard,
  loadPublicVerificationQuery,
  lookupCertificateForVerifyQuery,
} from "@/lib/certificates/verify-lookup";
import { computeVerificationToken } from "@/lib/certificates/token";

describe("getVerifiedShareCard", () => {
  beforeEach(() => {
    vi.mocked(prismaService.certificate.findUnique).mockReset();
    vi.mocked(rateLimitVerification).mockReset();
    process.env.CERT_HMAC_SECRET =
      process.env.CERT_HMAC_SECRET ||
      "test-secret-at-least-32-characters-long!!";
  });

  it("does not look up a certificate when the limiter denies", async () => {
    vi.mocked(rateLimitVerification).mockResolvedValue({
      success: false,
      remaining: 0,
    });
    const load = await loadPublicVerificationQuery(
      "LEO-UOM-2026-000001",
      "203.0.113.10",
    );
    expect(load).toEqual({ kind: "limited" });
    expect(prismaService.certificate.findUnique).not.toHaveBeenCalled();
  });

  it("returns null without a token", async () => {
    vi.mocked(prismaService.certificate.findUnique).mockResolvedValue({
      uniqueId: "LEO-UOM-2026-000001",
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

    expect(await getVerifiedShareCard("LEO-UOM-2026-000001", null)).toBeNull();
  });

  it("skips the database for a malformed certificate id", async () => {
    await lookupCertificateForVerifyQuery("not-a-certificate-id");
    expect(prismaService.certificate.findUnique).not.toHaveBeenCalled();
  });

  it("does not map a database error to a missing certificate", async () => {
    vi.mocked(prismaService.certificate.findUnique).mockRejectedValue(
      new Error("connection refused"),
    );
    await expect(
      lookupCertificateForVerifyQuery("LEO-UOM-2026-000001"),
    ).rejects.toThrow(/connection refused/);
  });

  it("returns share fields for a valid issued certificate", async () => {
    const fields = {
      uniqueId: "LEO-UOM-2026-000001",
      recipientName: "Ada Lovelace",
      eventId: "event",
      clubId: "club",
      issueDate: "2026-01-01",
      role: "Volunteer",
      tokenVersion: 1,
    };
    const token = computeVerificationToken(fields);
    vi.mocked(prismaService.certificate.findUnique).mockResolvedValue({
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
      event: {
        name: "Hackathon",
        club: {
          name: "Leo UoM",
          logoUrl: null,
          primaryColor: "#323232",
          accentColor: "#38a3e3",
          publicSlug: "leo-uom",
        },
      },
    } as never);

    const card = await getVerifiedShareCard(fields.uniqueId, token);
    expect(card).toEqual({
      recipientName: "Ada Lovelace",
      eventName: "Hackathon",
      clubName: "Leo UoM",
      role: "Volunteer",
      issueDate: "2026-01-01",
      uniqueId: "LEO-UOM-2026-000001",
      clubLogoUrl: null,
      primaryColor: "#323232",
      accentColor: "#38a3e3",
    });
  });
});
