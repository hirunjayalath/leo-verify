import { redirect } from "next/navigation";
import type { User as AppUser, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SessionUser = AppUser & {
  club: { id: string; code: string; name: string; districtId: string } | null;
  district: { id: string; code: string; name: string } | null;
};

/** Dev bypass is local-only. Never honor outside NODE_ENV=development or on Vercel. */
export function isAuthDevBypassEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.AUTH_DEV_BYPASS !== "true") return false;
  if (env.NODE_ENV !== "development") return false;
  // Fail closed on any Vercel deploy, even if NODE_ENV is wrongly set to development.
  if (env.VERCEL || env.VERCEL_ENV) return false;
  return true;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isAuthDevBypassEnabled()) {
    const email = process.env.SEED_ADMIN_EMAIL ?? "admin@uom.leoverify.local";
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          club: {
            select: { id: true, code: true, name: true, districtId: true },
          },
          district: { select: { id: true, code: true, name: true } },
        },
      });
    } catch {
      return null;
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const appUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: {
        club: {
          select: { id: true, code: true, name: true, districtId: true },
        },
        district: { select: { id: true, code: true, name: true } },
      },
    });

    return appUser;
  } catch {
    return null;
  }
}

/** Supabase Auth user for recipient journeys (claim/profile). Never uses admin bypass. */
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
  if (!user) redirect("/login");
  return user;
}

export async function requireClubAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "club_admin" && user.role !== "district_admin") {
    redirect("/login");
  }
  // District-only operators manage clubs from /admin/district
  if (user.role === "district_admin" && !user.clubId) {
    redirect("/admin/district");
  }
  if (!user.clubId) {
    throw new Error("Club admin is missing clubId");
  }
  return user;
}

export async function requireDistrictAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "district_admin") {
    redirect("/admin");
  }
  if (!user.districtId) {
    throw new Error("District admin is missing districtId");
  }
  return user;
}

export function isDistrictAdmin(role: UserRole): boolean {
  return role === "district_admin";
}
