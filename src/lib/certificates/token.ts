import { getServerEnv } from "@/lib/env";
import {
  computeVerificationToken as computeVerificationTokenPure,
  verifyVerificationToken as verifyVerificationTokenPure,
  type CertificateCanonicalFields,
  type HmacSecrets,
} from "@/lib/certificates/pure/token";

export {
  buildPdfDownloadPath,
  buildVerificationPath,
  canonicalize,
  type CertificateCanonicalFields,
  type HmacSecrets,
} from "@/lib/certificates/pure/token";

function hmacSecrets(): HmacSecrets {
  const env = getServerEnv();
  return {
    current: env.CERT_HMAC_SECRET,
    previous: env.CERT_HMAC_SECRET_PREVIOUS,
  };
}

export function computeVerificationToken(
  fields: CertificateCanonicalFields,
  secret?: string,
): string {
  return computeVerificationTokenPure(fields, secret ?? hmacSecrets().current);
}

/** Recompute HMAC from live certificate fields — never a stored token. */
export function tokenForCertificate(row: {
  uniqueId: string;
  recipientName: string;
  eventId: string;
  clubId: string;
  issueDate: Date | string;
  role: string;
  tokenVersion?: number | null;
}): string {
  const issueDate =
    typeof row.issueDate === "string"
      ? row.issueDate.slice(0, 10)
      : row.issueDate.toISOString().slice(0, 10);
  return computeVerificationToken({
    uniqueId: row.uniqueId,
    recipientName: row.recipientName,
    eventId: row.eventId,
    clubId: row.clubId,
    issueDate,
    role: row.role,
    tokenVersion: row.tokenVersion ?? 1,
  });
}

export function verifyVerificationToken(
  fields: CertificateCanonicalFields,
  token: string,
): boolean {
  return verifyVerificationTokenPure(fields, token, hmacSecrets());
}
