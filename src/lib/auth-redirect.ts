import { safeInternalPath } from "@/lib/safe-redirect";
import type { UserRole } from "@/generated/prisma/client";

export function homePathForRole(role?: UserRole | null): string {
  if (role === "district_admin") return "/admin/district";
  if (role === "club_admin") return "/admin";
  return "/claim";
}

export function isAdminRole(role?: UserRole | null): boolean {
  return role === "club_admin" || role === "district_admin";
}

export function isPathAllowedForRole(
  role: UserRole | null | undefined,
  path: string,
): boolean {
  const adminPath = path === "/admin" || path.startsWith("/admin/");
  if (isAdminRole(role)) return adminPath;
  return !adminPath;
}

/** Honor ?next= only when the path is safe for this role. */
export function postLoginPath(
  role: UserRole | null | undefined,
  next?: string | null,
): string {
  const home = homePathForRole(role);
  const candidate = safeInternalPath(next, home);
  return isPathAllowedForRole(role, candidate) ? candidate : home;
}

export function continueHref(next?: string | null): string {
  const candidate = next?.trim();
  if (!candidate) return "/continue";
  const safe = safeInternalPath(candidate, "");
  if (!safe) return "/continue";
  return `/continue?next=${encodeURIComponent(safe)}`;
}

/**
 * Bypass only when nobody is signed in. A real Auth session always wins.
 */
export function resolveSessionLookup(input: {
  bypassEnabled: boolean;
  authSupabaseId?: string | null;
  seedAdminSupabaseId?: string | null;
}): { source: "session" | "bypass"; supabaseId: string } | null {
  const authId = input.authSupabaseId?.trim();
  if (authId) return { source: "session", supabaseId: authId };
  const seedId = input.seedAdminSupabaseId?.trim();
  if (input.bypassEnabled && seedId) {
    return { source: "bypass", supabaseId: seedId };
  }
  return null;
}
