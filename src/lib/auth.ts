import { cache } from "react";
import { redirect } from "next/navigation";
import type {
  PrismaClient,
  User as AppUser,
  UserRole,
} from "@/generated/prisma/client";
import { resolveSessionLookup } from "@/lib/auth-redirect";
import { prismaService, withRlsContext } from "@/lib/db";
import { logOps } from "@/lib/observability";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SessionUser = AppUser & {
  club: { id: string; code: string; name: string; districtId: string } | null;
  district: { id: string; code: string; name: string } | null;
};

export type ClubAdminUser = SessionUser & { clubId: string };
export type DistrictAdminUser = SessionUser & { districtId: string };

/**
 * Write rule: DB-only actions use asClubAdmin (ALS transaction).
 * I/O services use requireClubAdmin + their own short withRlsContext
 * + assertNotInRlsContext. Do not wrap file/PDF/email work in asClubAdmin.
 */

/** Local-only. Never honor on Vercel even if NODE_ENV is wrongly development. */
export function isAuthDevBypassEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.AUTH_DEV_BYPASS !== "true") return false;
  if (env.NODE_ENV !== "development") return false;
  if (env.VERCEL || env.VERCEL_ENV) return false;
  return true;
}

const sessionInclude = {
  club: {
    select: { id: true, code: true, name: true, districtId: true },
  },
  district: { select: { id: true, code: true, name: true } },
} as const;

async function loadSessionUser(supabaseId: string): Promise<SessionUser | null> {
  try {
    const scoped = await withRlsContext(supabaseId, (tx) =>
      tx.user.findUnique({
        where: { supabaseId },
        include: sessionInclude,
      }),
    );
    if (!scoped) {
      logOps("auth.session_missing", {});
    }
    if (scoped?.disabledAt) {
      logOps("auth.session_disabled", {});
      return null;
    }
    return scoped;
  } catch (error) {
    logOps("auth.session_rls_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

type AuthIdentity = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
};

async function getAuthIdentity(): Promise<AuthIdentity | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? null,
      emailConfirmed: Boolean(user.email_confirmed_at),
    };
  } catch {
    return null;
  }
}

/** Match a Prisma User by verified email and repair a drifted Auth UUID. */
async function healSessionUserByEmail(
  authSupabaseId: string,
  email: string,
): Promise<SessionUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const existing = await prismaService.user.findFirst({
      where: { email: { equals: normalized, mode: "insensitive" } },
      select: { id: true, supabaseId: true },
    });
    if (!existing) return null;

    if (existing.supabaseId !== authSupabaseId) {
      try {
        await prismaService.user.update({
          where: { id: existing.id },
          data: { supabaseId: authSupabaseId },
        });
      } catch (error) {
        logOps("auth.supabase_id_heal_failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
        return loadSessionUser(existing.supabaseId);
      }
    }

    return loadSessionUser(authSupabaseId);
  } catch (error) {
    logOps("auth.email_lookup_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const auth = await getAuthIdentity();
  const plan = resolveSessionLookup({
    authSupabaseId: auth?.id ?? null,
  });
  if (!plan) return null;

  const byId = await loadSessionUser(plan.supabaseId);
  if (byId) return byId;
  if (auth?.email && auth.emailConfirmed) {
    return healSessionUserByEmail(plan.supabaseId, auth.email);
  }
  return null;
});

/** Run work with RLS GUC for this app user. */
export function withSessionRls<T>(
  user: SessionUser,
  fn: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return withRlsContext(user.supabaseId, fn);
}

/** Recipient claim/profile — never uses admin bypass. */
export async function getSupabaseAuthUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    // Recipients must not bounce login ↔ admin forever.
    const auth = await getSupabaseAuthUser();
    if (auth) redirect("/claim");
    redirect("/login");
  }
  return user;
}

export async function requireClubAdmin(): Promise<ClubAdminUser> {
  const user = await requireUser();
  if (user.role !== "club_admin" && user.role !== "district_admin") {
    redirect("/claim");
  }
  if (user.role === "district_admin" && !user.clubId) {
    redirect("/admin/district");
  }
  if (!user.clubId) {
    throw new Error("Club admin is missing clubId");
  }
  return user as ClubAdminUser;
}

export async function requireDistrictAdmin(): Promise<DistrictAdminUser> {
  const user = await requireUser();
  if (user.role !== "district_admin") {
    redirect("/admin");
  }
  if (!user.districtId) {
    throw new Error("District admin is missing districtId");
  }
  return user as DistrictAdminUser;
}

export function isDistrictAdmin(role: UserRole): boolean {
  return role === "district_admin";
}

export function isUomPlatformAdmin(user: {
  role: string;
  club?: { code: string } | null;
}): boolean {
  return user.role === "club_admin" && user.club?.code === "UOM";
}

export async function requireUomPlatformAdmin(): Promise<ClubAdminUser> {
  const user = await requireClubAdmin();
  if (!isUomPlatformAdmin(user)) {
    redirect("/admin");
  }
  return user;
}

export async function asClubAdmin<T>(
  fn: (user: ClubAdminUser, tx: PrismaClient) => Promise<T>,
): Promise<T> {
  const user = await requireClubAdmin();
  return withSessionRls(user, (tx) => fn(user, tx));
}

export async function asDistrictAdmin<T>(
  fn: (user: DistrictAdminUser, tx: PrismaClient) => Promise<T>,
): Promise<T> {
  const user = await requireDistrictAdmin();
  return withSessionRls(user, (tx) => fn(user, tx));
}
