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

export function isLeoVerifyQrPayload(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed.includes("/v/")) return false;
  const { id } = parseVerifyInput(trimmed);
  return Boolean(id);
}
