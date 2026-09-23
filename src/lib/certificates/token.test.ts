import { describe, expect, it } from "vitest";
import { formatCertificateId, parseCertificateId } from "@/lib/certificates/id";
import {
  computeVerificationToken,
  verifyVerificationToken,
  type CertificateCanonicalFields,
} from "@/lib/certificates/pure/token";
import { evaluateVerification } from "@/lib/certificates/pure/verify";

const SECRET = "test-hmac-secret-at-least-32-characters-long";
const PREVIOUS = "previous-hmac-secret-at-least-32-chars";
const secrets = { current: SECRET, previous: PREVIOUS };

const fields: CertificateCanonicalFields = {
  uniqueId: "LEO-UOM-2026-000123",
  recipientName: "Ada Lovelace",
  eventId: "evt_1",
  clubId: "club_1",
  issueDate: "2026-03-15",
  role: "Volunteer",
};

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
    const token = computeVerificationToken(fields, SECRET);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyVerificationToken(fields, token, secrets)).toBe(true);
  });

  it("rejects a wrong or tampered token", () => {
    const token = computeVerificationToken(fields, SECRET);
    expect(
      verifyVerificationToken(fields, token.slice(0, -1) + "0", secrets),
    ).toBe(false);
    expect(verifyVerificationToken(fields, "not-a-token", secrets)).toBe(false);
  });

  it("rejects when canonical fields were altered", () => {
    const token = computeVerificationToken(fields, SECRET);
    expect(
      verifyVerificationToken({ ...fields, role: "Winner" }, token, secrets),
    ).toBe(false);
  });

  it("accepts tokens signed with the previous secret (rotation)", () => {
    const legacyToken = computeVerificationToken(fields, PREVIOUS);
    expect(verifyVerificationToken(fields, legacyToken, secrets)).toBe(true);
  });

  it("rotates when tokenVersion changes (reissue)", () => {
    const v1 = computeVerificationToken({ ...fields, tokenVersion: 1 }, SECRET);
    const v2 = computeVerificationToken({ ...fields, tokenVersion: 2 }, SECRET);
    expect(v1).not.toEqual(v2);
    expect(
      verifyVerificationToken({ ...fields, tokenVersion: 1 }, v1, secrets),
    ).toBe(true);
    expect(
      verifyVerificationToken({ ...fields, tokenVersion: 2 }, v1, secrets),
    ).toBe(false);
    expect(
      verifyVerificationToken({ ...fields, tokenVersion: 2 }, v2, secrets),
    ).toBe(true);
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
    status: "issued" as const,
    clubId: fields.clubId,
    eventId: fields.eventId,
    clubName: "Leo Club of University of Moratuwa",
    eventName: "Annual Service Day 2026",
    pdfUrl: "https://example.com/cert.pdf",
  };

  it("returns valid public fields for a matching token", () => {
    const token = computeVerificationToken(fields, SECRET);
    const result = evaluateVerification(row, token, secrets);
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
    const token = computeVerificationToken(fields, SECRET);
    const result = evaluateVerification(
      { ...row, status: "revoked" },
      token,
      secrets,
    );
    expect(result).toEqual({
      status: "revoked",
      uniqueId: fields.uniqueId,
      message: "This certificate has been revoked.",
    });
  });

  it("uses a uniform invalid message (no existence oracle)", () => {
    expect(evaluateVerification(null, "deadbeef", secrets)).toEqual({
      status: "invalid",
      message: "Could not check this certificate.",
    });
    expect(evaluateVerification(row, null, secrets)).toEqual({
      status: "invalid",
      message: "Could not check this certificate.",
    });
    expect(evaluateVerification(row, "deadbeef", secrets)).toEqual({
      status: "invalid",
      message: "Could not check this certificate.",
    });
  });
});
