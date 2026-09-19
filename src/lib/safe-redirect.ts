/** Reject open redirects after login. */
export function safeInternalPath(
  candidate: string | null | undefined,
  fallback = "/admin",
): string {
  if (!candidate) return fallback;
  const path = candidate.trim();
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (path.includes("://")) return fallback;
  if (!/^\/[\w\-./]*$/.test(path)) return fallback;
  return path;
}
