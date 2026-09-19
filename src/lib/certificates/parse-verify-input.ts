/**
 * Parse a certificate ID, relative path, or absolute verify URL into id + token.
 * Used by the landing form and in-browser QR scanner.
 */
export function parseVerifyInput(raw: string): { id: string; token: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { id: "", token: "" };

  try {
    const asUrl = trimmed.includes("://")
      ? new URL(trimmed)
      : trimmed.startsWith("/")
        ? new URL(trimmed, "http://local.invalid")
        : null;
    if (asUrl) {
      const match = asUrl.pathname.match(/\/v\/([^/?#]+)/i);
      if (match) {
        return {
          id: decodeURIComponent(match[1]),
          token: asUrl.searchParams.get("t") || "",
        };
      }
    }
  } catch {
    /* treat as plain ID */
  }

  return { id: trimmed, token: "" };
}

/** True when the payload is a LeoVerify verify URL (path contains /v/{id}). */
export function isLeoVerifyQrPayload(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed.includes("/v/")) return false;
  const { id } = parseVerifyInput(trimmed);
  return Boolean(id);
}
