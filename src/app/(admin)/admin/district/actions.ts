"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asDistrictAdmin } from "@/lib/auth";
import {
  createClub,
  inviteClubAdmin,
  reviewTemplate,
} from "@/lib/orgs/service";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createClubAction(formData: FormData): Promise<ActionResult> {
  return asDistrictAdmin(async (user) => {
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

  const result = await createClub({
    districtId: user.districtId!,
    actorUserId: user.id,
    name: parsed.data.name,
    code: parsed.data.code,
  });
  if (!result.ok) return result;
  revalidatePath("/admin/district");
  return result;
  });
}

export async function inviteClubAdminAction(formData: FormData): Promise<ActionResult> {
  return asDistrictAdmin(async (user) => {
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

  const result = await inviteClubAdmin({
    districtId: user.districtId!,
    actorUserId: user.id,
    clubId: parsed.data.clubId,
    email: parsed.data.email,
    name: parsed.data.name || undefined,
    supabaseId: parsed.data.supabaseId,
  });
  if (!result.ok) return result;
  revalidatePath("/admin/district");
  return result;
  });
}

export async function reviewTemplateAction(formData: FormData): Promise<ActionResult> {
  return asDistrictAdmin(async (user) => {
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const note = String(formData.get("note") || "").trim();
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    return { ok: false, error: "Invalid review" };
  }

  const result = await reviewTemplate({
    districtId: user.districtId!,
    actorUserId: user.id,
    templateId: id,
    decision,
    note,
  });
  if (!result.ok) return result;
  revalidatePath("/admin/district");
  revalidatePath("/admin/templates");
  return result;
  });
}
