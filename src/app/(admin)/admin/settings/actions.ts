"use server";

import { revalidatePath } from "next/cache";
import { requireClubAdmin } from "@/lib/auth";
import { updateClubBranding } from "@/lib/orgs/service";

export type BrandingActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateClubBrandingAction(
  formData: FormData,
): Promise<BrandingActionResult> {
  const user = await requireClubAdmin();
  const logo = formData.get("logo");
  const result = await updateClubBranding({
    clubId: user.clubId!,
    actorUserId: user.id,
    orgNameFallback: user.club?.name || "org",
    tagline: String(formData.get("tagline") || "").trim(),
    publicSlug: String(formData.get("publicSlug") || "").trim(),
    primaryColor: String(formData.get("primaryColor") || "#323232"),
    accentColor: String(formData.get("accentColor") || "#38a3e3"),
    logo: logo instanceof File ? logo : null,
  });
  if (!result.ok) return result;

  revalidatePath("/admin/settings");
  if (result.slug) revalidatePath(`/o/${result.slug}`);
  if (result.previousSlug && result.previousSlug !== result.slug) {
    revalidatePath(`/o/${result.previousSlug}`);
  }
  revalidatePath("/admin");
  return { ok: true };
}
