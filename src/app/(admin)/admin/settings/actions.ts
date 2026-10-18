"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { requireClubAdmin } from "@/lib/auth";
import { captureException } from "@/lib/observability";
import { updateClubBranding } from "@/lib/orgs/service";

const brandingSchema = z.object({
  tagline: z.string().trim(),
  publicSlug: z.string().trim(),
  primaryColor: z.string().min(1),
  accentColor: z.string().min(1),
});

export async function updateClubBrandingAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const parsed = brandingSchema.safeParse({
    tagline: formData.get("tagline") || "",
    publicSlug: formData.get("publicSlug") || "",
    primaryColor: formData.get("primaryColor") || "#323232",
    accentColor: formData.get("accentColor") || "#374151",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const logo = formData.get("logo");
  try {
    const result = await updateClubBranding({
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      orgNameFallback: user.club?.name || "org",
      tagline: parsed.data.tagline,
      publicSlug: parsed.data.publicSlug,
      primaryColor: parsed.data.primaryColor,
      accentColor: parsed.data.accentColor,
      logo: logo instanceof File ? logo : null,
    });
    if (!result.ok) return result;

    revalidatePath("/admin/settings");
    if (result.slug) revalidatePath(`/o/${result.slug}`);
    if (result.previousSlug && result.previousSlug !== result.slug) {
      revalidatePath(`/o/${result.previousSlug}`);
    }
    revalidatePath("/admin");
    return ok();
  } catch (error) {
    await captureException(error, { phase: "club.branding" });
    return fail("Could not update branding");
  }
}
