"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail } from "@/lib/action-result";
import { asDistrictAdmin } from "@/lib/auth";
import { captureException } from "@/lib/observability";
import {
  createClub,
  inviteClubAdmin,
  reviewTemplate,
} from "@/lib/orgs/service";

export async function createClubAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asDistrictAdmin(async (user) => {
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
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }

      const result = await createClub({
        districtId: user.districtId,
        actorUserId: user.id,
        name: parsed.data.name,
        code: parsed.data.code,
      });
      if (!result.ok) return result;
      revalidatePath("/admin/district");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "club.create" });
    return fail("Could not create club");
  }
}

export async function inviteClubAdminAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asDistrictAdmin(async (user) => {
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
        return fail(parsed.error.issues[0]?.message ?? "Invalid input");
      }

      const result = await inviteClubAdmin({
        districtId: user.districtId,
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
  } catch (error) {
    await captureException(error, { phase: "user.invite" });
    return fail("Could not invite admin");
  }
}

export async function reviewTemplateAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asDistrictAdmin(async (user) => {
      const parsed = z
        .object({
          id: z.string().min(1),
          decision: z.enum(["approved", "rejected"]),
          note: z.string().trim(),
        })
        .safeParse({
          id: formData.get("id"),
          decision: formData.get("decision"),
          note: formData.get("note") || "",
        });
      if (!parsed.success) return fail("Invalid review");

      const result = await reviewTemplate({
        districtId: user.districtId,
        actorUserId: user.id,
        templateId: parsed.data.id,
        decision: parsed.data.decision,
        note: parsed.data.note,
      });
      if (!result.ok) return result;
      revalidatePath("/admin/district");
      revalidatePath("/admin/templates");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "template.review" });
    return fail("Could not review template");
  }
}
