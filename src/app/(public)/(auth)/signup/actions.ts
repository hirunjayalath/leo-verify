"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ClubType, PlanTier, UserRole } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";

export type SignupResult =
  | { ok: true; clubId: string }
  | { ok: false; error: string };

/**
 * Self-serve signup for public organizations (Phase 2).
 * Creates a public-type club under the PUBLIC district and a club_admin user stub.
 */
export async function signupPublicOrgAction(
  formData: FormData,
): Promise<SignupResult> {
  const parsed = z
    .object({
      orgName: z.string().trim().min(2).max(200),
      orgCode: z
        .string()
        .trim()
        .min(2)
        .max(12)
        .regex(/^[A-Za-z0-9]+$/),
      adminEmail: z.string().email(),
      adminName: z.string().trim().min(2).max(200),
      supabaseId: z.string().min(1),
    })
    .safeParse({
      orgName: formData.get("orgName"),
      orgCode: formData.get("orgCode"),
      adminEmail: formData.get("adminEmail"),
      adminName: formData.get("adminName"),
      supabaseId: formData.get("supabaseId"),
    });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
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

  const club = await prisma.club.create({
    data: {
      name: parsed.data.orgName,
      code: parsed.data.orgCode.toUpperCase(),
      districtId: district.id,
      type: ClubType.public,
      plan: PlanTier.free,
      monthlyCertLimit: 50,
    },
  });

  await prisma.user.upsert({
    where: { email: parsed.data.adminEmail.toLowerCase() },
    update: {
      supabaseId: parsed.data.supabaseId,
      name: parsed.data.adminName,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: district.id,
    },
    create: {
      email: parsed.data.adminEmail.toLowerCase(),
      supabaseId: parsed.data.supabaseId,
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

export async function assertWithinCertLimit(clubId: string): Promise<void> {
  const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const count = await prisma.certificate.count({
    where: { clubId, createdAt: { gte: start } },
  });
  if (count >= club.monthlyCertLimit) {
    throw new Error(
      `Monthly certificate limit reached (${club.monthlyCertLimit}). Upgrade plan to continue.`,
    );
  }
}
