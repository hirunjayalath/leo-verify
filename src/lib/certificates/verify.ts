import { CertificateStatus } from "@/generated/prisma/client";
import {
  type CertificateCanonicalFields,
  verifyVerificationToken,
} from "@/lib/certificates/token";

/** Fields safe to expose on the public verification page (Rule 8). */
export type PublicVerificationResult =
  | {
      status: "valid";
      uniqueId: string;
      recipientName: string;
      clubName: string;
      eventName: string;
      issueDate: string;
      role: string;
      achievement: string | null;
    }
  | {
      status: "revoked";
      uniqueId: string;
      /** Per client decision: revoked pages show no further detail. */
      message: "This certificate has been revoked.";
    }
  | {
      status: "invalid";
      message: string;
    };

export type CertificateLookupRow = {
  uniqueId: string;
  verificationToken: string;
  recipientName: string;
  role: string;
  achievement: string | null;
  issueDate: Date;
  status: CertificateStatus;
  clubId: string;
  eventId: string;
  clubName: string;
  eventName: string;
};

/**
 * Pure verification decision used by the public /v/[id] page.
 * Always driven by live DB fields + HMAC check — never by PDF contents (Rule 1).
 */
export function evaluateVerification(
  row: CertificateLookupRow | null,
  providedToken: string | null | undefined,
): PublicVerificationResult {
  if (!row) {
    return { status: "invalid", message: "Certificate not found." };
  }

  if (!providedToken) {
    return { status: "invalid", message: "Missing verification token." };
  }

  const fields: CertificateCanonicalFields = {
    uniqueId: row.uniqueId,
    recipientName: row.recipientName,
    eventId: row.eventId,
    clubId: row.clubId,
    issueDate: row.issueDate.toISOString().slice(0, 10),
    role: row.role,
  };

  if (!verifyVerificationToken(fields, providedToken)) {
    return { status: "invalid", message: "Invalid or tampered verification link." };
  }

  if (row.status === CertificateStatus.revoked) {
    return {
      status: "revoked",
      uniqueId: row.uniqueId,
      message: "This certificate has been revoked.",
    };
  }

  return {
    status: "valid",
    uniqueId: row.uniqueId,
    recipientName: row.recipientName,
    clubName: row.clubName,
    eventName: row.eventName,
    issueDate: fields.issueDate,
    role: row.role,
    achievement: row.achievement,
  };
}
