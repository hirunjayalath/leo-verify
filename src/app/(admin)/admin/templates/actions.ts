"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail } from "@/lib/action-result";
import { asClubAdmin, requireClubAdmin } from "@/lib/auth";
import { captureException } from "@/lib/observability";
import {
  approveOwnTemplate,
  createFromGallery,
  createTemplate,
  duplicateTemplate,
  renameTemplate,
  revertTemplateToDraft,
  saveTemplateLayout,
  uploadTemplateSignature,
} from "@/lib/templates/service";

const idSchema = z.object({ id: z.string().min(1) });
const templateIdSchema = z.object({ templateId: z.string().min(1) });
const createSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(2),
  kind: z.enum(["certificate", "service_letter"]).optional(),
});
const gallerySchema = z.object({
  eventId: z.string().min(1),
  galleryId: z.string().min(1),
  name: z.string().trim(),
});
const renameSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2),
});

export async function createTemplateAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  const user = await requireClubAdmin();
  const file = formData.get("background");
  if (!(file instanceof File)) {
    return fail("Background image is required");
  }
  const parsed = createSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    kind: formData.get("kind") || "certificate",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  try {
    const result = await createTemplate({
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      eventId: parsed.data.eventId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      background: file,
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    revalidatePath("/admin/district");
    return result;
  } catch (error) {
    await captureException(error, { phase: "template.create" });
    return fail("Could not create template");
  }
}

export async function approveOwnTemplateAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = idSchema.safeParse({ id: formData.get("id") });
      if (!parsed.success) return fail("Template id required");
      const result = await approveOwnTemplate({
        clubId: user.clubId,
        actorUserId: user.id,
        templateId: parsed.data.id,
      });
      if (!result.ok) return result;
      revalidatePath("/admin/templates");
      revalidatePath("/admin/district");
      revalidatePath("/admin/audit");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "template.approve" });
    return fail("Could not approve template");
  }
}

export async function saveTemplateLayoutAction(input: {
  templateId: string;
  layout: unknown;
}): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = templateIdSchema.safeParse({ templateId: input.templateId });
      if (!parsed.success) return fail("Template id required");
      const result = await saveTemplateLayout({
        clubId: user.clubId,
        actorUserId: user.id,
        templateId: parsed.data.templateId,
        layout: input.layout,
      });
      if (!result.ok) return result;
      revalidatePath(`/admin/templates/${parsed.data.templateId}/edit`);
      revalidatePath("/admin/templates");
      revalidatePath("/admin/audit");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "template.layout" });
    return fail("Could not save layout");
  }
}

export async function uploadTemplateSignatureAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string; url?: string }>> {
  const user = await requireClubAdmin();
  const file = formData.get("signature");
  if (!(file instanceof File)) {
    return fail("Signature image is required");
  }
  const parsed = templateIdSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) return fail("Template id required");
  try {
    return await uploadTemplateSignature({
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      templateId: parsed.data.templateId,
      signature: file,
    });
  } catch (error) {
    await captureException(error, { phase: "template.signature" });
    return fail("Could not upload signature");
  }
}

export async function renameTemplateAction(formData: FormData): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = renameSchema.safeParse({
        id: formData.get("id"),
        name: formData.get("name"),
      });
      if (!parsed.success) return fail("Invalid name");
      const result = await renameTemplate({
        clubId: user.clubId,
        actorUserId: user.id,
        templateId: parsed.data.id,
        name: parsed.data.name,
      });
      if (!result.ok) return result;
      revalidatePath("/admin/templates");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "template.rename" });
    return fail("Could not rename template");
  }
}

export async function revertTemplateToDraftAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = idSchema.safeParse({ id: formData.get("id") });
      if (!parsed.success) return fail("Template id required");
      const result = await revertTemplateToDraft({
        clubId: user.clubId,
        actorUserId: user.id,
        templateId: parsed.data.id,
      });
      if (!result.ok) return result;
      revalidatePath("/admin/templates");
      revalidatePath("/admin/district");
      revalidatePath("/admin/audit");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "template.revert" });
    return fail("Could not revert template");
  }
}

export async function createFromGalleryAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  const user = await requireClubAdmin();
  const parsed = gallerySchema.safeParse({
    eventId: formData.get("eventId"),
    galleryId: formData.get("galleryId"),
    name: formData.get("name") || "",
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  try {
    const result = await createFromGallery({
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      eventId: parsed.data.eventId,
      galleryId: parsed.data.galleryId,
      name: parsed.data.name,
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    revalidatePath("/admin");
    return result;
  } catch (error) {
    await captureException(error, { phase: "template.gallery" });
    return fail("Could not create template");
  }
}

export async function duplicateTemplateAction(
  formData: FormData,
): Promise<ActionResult<{ id?: string }>> {
  try {
    return await asClubAdmin(async (user) => {
      const parsed = idSchema.safeParse({ id: formData.get("id") });
      if (!parsed.success) return fail("Template id required");
      const result = await duplicateTemplate({
        clubId: user.clubId,
        actorUserId: user.id,
        templateId: parsed.data.id,
      });
      if (!result.ok) return result;
      revalidatePath("/admin/templates");
      return result;
    });
  } catch (error) {
    await captureException(error, { phase: "template.duplicate" });
    return fail("Could not duplicate template");
  }
}
