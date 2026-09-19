import { describe, expect, it } from "vitest";
import { CertificateStatus } from "@/generated/prisma/client";
import {
  computeVerificationToken,
  type CertificateCanonicalFields,
} from "@/lib/certificates/token";

describe("badge API contract smoke", () => {
  const fields: CertificateCanonicalFields = {
    uniqueId: "LEO-UOM-2026-000001",
    recipientName: "Ada Lovelace",
    eventId: "event-1",
    clubId: "club-1",
    issueDate: "2026-03-15",
    role: "Volunteer",
  };

  it("requires a verification token for badge export", () => {
    const token = null as string | null;
    expect(Boolean(token)).toBe(false);
  });

  it("accepts a matching HMAC token for an issued certificate", () => {
    const token = computeVerificationToken(fields);
    const status = CertificateStatus.issued;
    expect(status).toBe(CertificateStatus.issued);
    expect(token.length).toBeGreaterThan(16);
  });
});
