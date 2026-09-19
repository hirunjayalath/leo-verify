"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ClubType, PlanTier, UserRole } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { getSupabaseAuthUser } from "@/lib/auth";
import { slugifyPublic } from "@/lib/branding";
import { prisma } from "@/lib/db";
import {
  clientIpFromHeaders,
  rateLimitSignup,
} from "@/lib/rate-limit";

export type SignupResult =
  | { ok: true; clubId: string }
  | { ok: false; error: string };

/**
 * Self-serve signup for public organizations (Phase 2).
 * Requires an authenticated Supabase session; binds identity from the session only.
 */
export async function signupPublicOrgAction(
  formData: FormData,
): Promise<SignupResult> {
  const auth = await getSupabaseAuthUser();
  if (!auth) {
    return {
      ok: false,
      error: "Sign in before creating an organization.",
    };
  }

  const headerList = await headers();
  const limit = await rateLimitSignup(clientIpFromHeaders(headerList));
  if (!limit.success) {
    return { ok: false, error: "Too many signup attempts. Try again later." };
  }

  const parsed = z
    .object({
      orgName: z.string().trim().min(2).max(200),
      orgCode: z
        .string()
        .trim()
        .min(2)
        .max(12)
        .regex(/^[A-Za-z0-9]+$/),
      adminName: z.string().trim().min(2).max(200),
    })
    .safeParse({
      orgName: formData.get("orgName"),
      orgCode: formData.get("orgCode"),
      adminName: formData.get("adminName"),
    });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const adminEmail = auth.email.toLowerCase();
  const supabaseId = auth.id;

  const existingByEmail = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (existingByEmail) {
    return {
      ok: false,
      error: "An account with this email already exists. Contact support if this is unexpected.",
    };
  }

  const existingBySupabase = await prisma.user.findUnique({
    where: { supabaseId },
  });
  if (existingBySupabase) {
    return {
      ok: false,
      error: "This Auth user is already linked to an organization.",
    };
  }

  const district = await prisma.district.upsert({
    where: { code: "PUBLIC" },
    update: {},
    create: { code: "PUBLIC", name: "Public organizations" },
  });

  const existing = await prisma.club.findUnique({
    where: { code: parsed.data.orgCode.toUpperCase() },
  });
  if (existing) return { ok: false, error: "Organization code already taken" };

  const baseSlug = slugifyPublic(parsed.data.orgName) || slugifyPublic(parsed.data.orgCode);
  let publicSlug = baseSlug;
  let n = 1;
  while (await prisma.club.findUnique({ where: { publicSlug } })) {
    publicSlug = `${baseSlug}-${n++}`.slice(0, 48);
  }

  const club = await prisma.club.create({
    data: {
      name: parsed.data.orgName,
      code: parsed.data.orgCode.toUpperCase(),
      districtId: district.id,
      type: ClubType.public,
      plan: PlanTier.free,
      monthlyCertLimit: 50,
      publicSlug,
      primaryColor: "#323232",
      accentColor: "#38a3e3",
    },
  });

  await prisma.user.create({
    data: {
      email: adminEmail,
      supabaseId,
      name: parsed.data.adminName,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: district.id,
    },
  });

  await writeAuditLog({
    action: "club.create",
    targetType: "Club",
    targetId: club.id,
    clubId: club.id,
    metadata: { type: "public", plan: "free" },
  });

  revalidatePath("/signup");
  return { ok: true, clubId: club.id };
}
