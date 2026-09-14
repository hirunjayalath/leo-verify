import { afterEach, describe, expect, it } from "vitest";
import { formatCertificateId, parseCertificateId } from "@/lib/certificates/id";
import {
  computeVerificationToken,
  verifyVerificationToken,
  type CertificateCanonicalFields,
} from "@/lib/certificates/token";
import { evaluateVerification } from "@/lib/certificates/verify";
import { CertificateStatus } from "@/generated/prisma/client";
import { resetServerEnvCache } from "@/lib/env";

const fields: CertificateCanonicalFields = {
  uniqueId: "LEO-UOM-2026-000123",
  recipientName: "Ada Lovelace",
  eventId: "evt_1",
  clubId: "club_1",
  issueDate: "2026-03-15",
  role: "Volunteer",
};

afterEach(() => {
  resetServerEnvCache();
});

describe("certificate ID", () => {
  it("formats LEO-{CLUB}-{YEAR}-{SEQ}", () => {
    expect(formatCertificateId("UOM", 2026, 123)).toBe("LEO-UOM-2026-000123");
  });

  it("parses a valid ID", () => {
    expect(parseCertificateId("LEO-UOM-2026-000123")).toEqual({
      clubCode: "UOM",
      year: 2026,
      sequence: 123,
    });
  });
});

describe("HMAC verification token (Rule 2 / Rule 11)", () => {
  it("issues a token retrievable by ID+token", () => {
    const token = computeVerificationToken(fields);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyVerificationToken(fields, token)).toBe(true);
  });

  it("rejects a wrong or tampered token", () => {
    const token = computeVerificationToken(fields);
    expect(verifyVerificationToken(fields, token.slice(0, -1) + "0")).toBe(false);
    expect(verifyVerificationToken(fields, "not-a-token")).toBe(false);
  });

  it("rejects when canonical fields were altered", () => {
    const token = computeVerificationToken(fields);
    expect(
      verifyVerificationToken({ ...fields, role: "Winner" }, token),
    ).toBe(false);
  });

  it("accepts tokens signed with the previous secret (rotation)", () => {
    const previous = process.env.CERT_HMAC_SECRET_PREVIOUS!;
    const legacyToken = computeVerificationToken(fields, previous);
    expect(verifyVerificationToken(fields, legacyToken)).toBe(true);
  });
});

describe("evaluateVerification (Rule 1 / Rule 8 / revoked display)", () => {
  const row = {
    uniqueId: fields.uniqueId,
    verificationToken: "",
    recipientName: fields.recipientName,
    role: fields.role,
    achievement: "Community Service",
    issueDate: new Date("2026-03-15T00:00:00.000Z"),
    status: CertificateStatus.issued,
    clubId: fields.clubId,
    eventId: fields.eventId,
    clubName: "Leo Club of University of Moratuwa",
    eventName: "Annual Service Day 2026",
    pdfUrl: "https://example.com/cert.pdf",
  };

  it("returns valid public fields for a matching token", () => {
    const token = computeVerificationToken(fields);
    const result = evaluateVerification(row, token);
    expect(result).toEqual({
      status: "valid",
      uniqueId: fields.uniqueId,
      recipientName: "Ada Lovelace",
      clubName: "Leo Club of University of Moratuwa",
      eventName: "Annual Service Day 2026",
      issueDate: "2026-03-15",
      role: "Volunteer",
      achievement: "Community Service",
      pdfUrl: `/api/certificates/${encodeURIComponent(fields.uniqueId)}/pdf?t=${encodeURIComponent(token)}`,
    });
  });

  it("shows revoked with no further detail", () => {
    const token = computeVerificationToken(fields);
    const result = evaluateVerification(
      { ...row, status: CertificateStatus.revoked },
      token,
    );
    expect(result).toEqual({
      status: "revoked",
      uniqueId: fields.uniqueId,
      message: "This certificate has been revoked.",
    });
  });

  it("uses a uniform invalid message (no existence oracle)", () => {
    expect(evaluateVerification(null, "deadbeef")).toEqual({
      status: "invalid",
      message: "Could not verify this certificate.",
    });
    expect(evaluateVerification(row, null)).toEqual({
      status: "invalid",
      message: "Could not verify this certificate.",
    });
    expect(evaluateVerification(row, "deadbeef")).toEqual({
      status: "invalid",
      message: "Could not verify this certificate.",
    });
  });
});
