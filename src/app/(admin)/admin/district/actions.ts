"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TemplateStatus, UserRole } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireDistrictAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createClubAction(formData: FormData): Promise<ActionResult> {
  const user = await requireDistrictAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(200),
      code: z
        .string()
        .trim()
        .min(2)
        .max(12)
        .regex(/^[A-Za-z0-9]+$/),
    })
    .safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
    });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const club = await prisma.club.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code.toUpperCase(),
      districtId: user.districtId!,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "club.create",
    targetType: "Club",
    targetId: club.id,
    metadata: { code: club.code },
  });

  revalidatePath("/admin/district");
  return { ok: true, id: club.id };
}

export async function inviteClubAdminAction(formData: FormData): Promise<ActionResult> {
  const user = await requireDistrictAdmin();
  const parsed = z
    .object({
      clubId: z.string().min(1),
      email: z.string().email(),
      name: z.string().trim().min(2).optional().or(z.literal("")),
      supabaseId: z.string().min(1),
    })
    .safeParse({
      clubId: formData.get("clubId"),
      email: formData.get("email"),
      name: formData.get("name") || "",
      supabaseId: formData.get("supabaseId"),
    });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const club = await prisma.club.findFirst({
    where: { id: parsed.data.clubId, districtId: user.districtId! },
  });
  if (!club) return { ok: false, error: "Club not found in your district" };

  const invited = await prisma.user.upsert({
    where: { email: parsed.data.email },
    update: {
      supabaseId: parsed.data.supabaseId,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: user.districtId!,
      name: parsed.data.name || undefined,
    },
    create: {
      email: parsed.data.email,
      supabaseId: parsed.data.supabaseId,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: user.districtId!,
      name: parsed.data.name || null,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "user.invite",
    targetType: "User",
    targetId: invited.id,
    clubId: club.id,
    metadata: { email: invited.email },
  });

  revalidatePath("/admin/district");
  return { ok: true, id: invited.id };
}

export async function reviewTemplateAction(formData: FormData): Promise<ActionResult> {
  const user = await requireDistrictAdmin();
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    return { ok: false, error: "Invalid review" };
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: {
      id,
      club: { districtId: user.districtId! },
    },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id },
    data: {
      status:
        decision === "approved"
          ? TemplateStatus.approved
          : TemplateStatus.rejected,
      reviewNote: note || null,
      lastEditedById: user.id,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: decision === "approved" ? "template.approve" : "template.reject",
    targetType: "CertificateTemplate",
    targetId: id,
    clubId: template.clubId,
    metadata: { note },
  });

  revalidatePath("/admin/district");
  revalidatePath("/admin/templates");
  return { ok: true, id };
}
