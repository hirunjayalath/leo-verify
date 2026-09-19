/** Labels only — verification always requires the HMAC token (Rule 2). */

export function formatCertificateId(
  clubCode: string,
  year: number,
  sequence: number,
): string {
  const code = clubCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!code) throw new Error("clubCode is required");
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("year must be a valid integer year");
  }
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 999999) {
    throw new Error("sequence must be an integer between 1 and 999999");
  }
  return `LEO-${code}-${year}-${String(sequence).padStart(6, "0")}`;
}

export function parseCertificateId(uniqueId: string): {
  clubCode: string;
  year: number;
  sequence: number;
} | null {
  const match = /^LEO-([A-Z0-9]+)-(\d{4})-(\d{6})$/.exec(uniqueId);
  if (!match) return null;
  return {
    clubCode: match[1],
    year: Number(match[2]),
    sequence: Number(match[3]),
  };
}
