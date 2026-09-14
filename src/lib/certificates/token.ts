import { createHmac, timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

/** Canonical fields used for HMAC — keep stable for Open Badges export later. */
export type CertificateCanonicalFields = {
  uniqueId: string;
  recipientName: string;
  eventId: string;
  clubId: string;
  issueDate: string; // ISO date YYYY-MM-DD
  role: string;
};

export function canonicalize(fields: CertificateCanonicalFields): string {
  return [
    fields.uniqueId,
    fields.recipientName.trim(),
    fields.eventId,
    fields.clubId,
    fields.issueDate,
    fields.role.trim(),
  ].join("|");
}

export function computeVerificationToken(
  fields: CertificateCanonicalFields,
  secret?: string,
): string {
  const key = secret ?? getServerEnv().CERT_HMAC_SECRET;
  return createHmac("sha256", key).update(canonicalize(fields)).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Verifies a token against the current secret, then the previous secret
 * (supports zero-downtime rotation of CERT_HMAC_SECRET).
 */
export function verifyVerificationToken(
  fields: CertificateCanonicalFields,
  token: string,
): boolean {
  if (!token || typeof token !== "string") return false;

  const env = getServerEnv();
  const current = computeVerificationToken(fields, env.CERT_HMAC_SECRET);
  if (safeEqualHex(current, token)) return true;

  const previous = env.CERT_HMAC_SECRET_PREVIOUS;
  if (previous && previous.length >= 32) {
    const legacy = computeVerificationToken(fields, previous);
    if (safeEqualHex(legacy, token)) return true;
  }

  return false;
}

export function buildVerificationPath(uniqueId: string, token: string): string {
  return `/v/${encodeURIComponent(uniqueId)}?t=${encodeURIComponent(token)}`;
}

export function buildPdfDownloadPath(uniqueId: string, token: string): string {
  return `/api/certificates/${encodeURIComponent(uniqueId)}/pdf?t=${encodeURIComponent(token)}`;
}
