"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail } from "@/lib/action-result";
import { requireUomPlatformAdmin } from "@/lib/auth";
import {
  createDistrict,
  disableDistrictAdmin,
  inviteDistrictAdmin,
} from "@/lib/orgs/platform";
import { sendClubAdminAssignedEmail } from "@/lib/email/resend";
import { inviteOrFindAuthUser } from "@/lib/supabase/admin";
import { captureException } from "@/lib/observability";

export async function createDistrictAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  const user = await requireUomPlatformAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(200),
      code: z.string().trim().min(2).max(12),
    })
    .safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid");
  try {
    const result = await createDistrict({
      actorUserId: user.id,
      name: parsed.data.name,
      code: parsed.data.code,
    });
    if (result.ok) revalidatePath("/admin/operators");
    return result;
  } catch (error) {
    await captureException(error, { phase: "district.create" });
    return fail("Could not create district");
  }
}

export async function inviteDistrictAdminAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  const user = await requireUomPlatformAdmin();
  const parsed = z
    .object({
      districtId: z.string().min(1),
      clubId: z.string().min(1),
      email: z.string().email(),
      name: z.string().trim().optional(),
    })
    .safeParse({
      districtId: formData.get("districtId"),
      clubId: formData.get("clubId"),
      email: formData.get("email"),
      name: String(formData.get("name") || "").trim() || undefined,
    });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid");
  try {
    const auth = await inviteOrFindAuthUser(parsed.data.email);
    const result = await inviteDistrictAdmin({
      actorUserId: user.id,
      districtId: parsed.data.districtId,
      clubId: parsed.data.clubId,
      email: parsed.data.email,
      name: parsed.data.name,
      supabaseId: auth.id,
    });
    if (result.ok) {
      revalidatePath("/admin/operators");
      await sendClubAdminAssignedEmail({
        to: parsed.data.email,
        name: parsed.data.name || parsed.data.email,
        clubName: "LeoVerify district",
      });
    }
    return result;
  } catch (error) {
    await captureException(error, { phase: "district.invite" });
    return fail("Could not invite district admin");
  }
}

export async function disableDistrictAdminAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  const user = await requireUomPlatformAdmin();
  const parsed = z.object({ userId: z.string().min(1) }).safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) return fail("User required");
  try {
    const result = await disableDistrictAdmin({
      actorUserId: user.id,
      userId: parsed.data.userId,
    });
    if (result.ok) revalidatePath("/admin/operators");
    return result;
  } catch (error) {
    await captureException(error, { phase: "district.disable" });
    return fail("Could not disable district admin");
  }
}
