import { createHmac, timingSafeEqual } from "node:crypto";

/** Canonical HMAC fields — keep stable for Open Badges export. */
export type CertificateCanonicalFields = {
  uniqueId: string;
  recipientName: string;
  eventId: string;
  clubId: string;
  issueDate: string; // ISO date YYYY-MM-DD
  role: string;
  /** Bumped on reissue so tokens rotate. */
  tokenVersion?: number;
};

export type HmacSecrets = {
  current: string;
  previous?: string | null;
};

export function canonicalize(fields: CertificateCanonicalFields): string {
  const version = fields.tokenVersion ?? 1;
  return [
    fields.uniqueId,
    fields.recipientName.trim(),
    fields.eventId,
    fields.clubId,
    fields.issueDate,
    fields.role.trim(),
    String(version),
  ].join("|");
}

export function computeVerificationToken(
  fields: CertificateCanonicalFields,
  secret: string,
): string {
  return createHmac("sha256", secret).update(canonicalize(fields)).digest("hex");
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

/** Checks current secret, then previous for rotation. */
export function verifyVerificationToken(
  fields: CertificateCanonicalFields,
  token: string,
  secrets: HmacSecrets,
): boolean {
  if (!token || typeof token !== "string") return false;

  const current = computeVerificationToken(fields, secrets.current);
  if (safeEqualHex(current, token)) return true;

  const previous = secrets.previous;
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
