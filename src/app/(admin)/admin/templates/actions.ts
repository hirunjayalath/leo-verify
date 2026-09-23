"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { asClubAdmin } from "@/lib/auth";
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

export type { ActionResult };

export async function createTemplateAction(formData: FormData): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const file = formData.get("background");
    if (!(file instanceof File)) {
      return { ok: false, error: "Background image is required" };
    }
    const result = await createTemplate({
      clubId: user.clubId!,
      actorUserId: user.id,
      eventId: String(formData.get("eventId") || ""),
      name: String(formData.get("name") || "").trim(),
      background: file,
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    revalidatePath("/admin/district");
    return result;
  });
}

export async function approveOwnTemplateAction(
  formData: FormData,
): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const result = await approveOwnTemplate({
      clubId: user.clubId!,
      actorUserId: user.id,
      templateId: String(formData.get("id") || ""),
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    revalidatePath("/admin/district");
    revalidatePath("/admin/audit");
    return result;
  });
}

export async function saveTemplateLayoutAction(input: {
  templateId: string;
  layout: unknown;
}): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const result = await saveTemplateLayout({
      clubId: user.clubId!,
      actorUserId: user.id,
      templateId: input.templateId,
      layout: input.layout,
    });
    if (!result.ok) return result;
    revalidatePath(`/admin/templates/${input.templateId}/edit`);
    revalidatePath("/admin/templates");
    revalidatePath("/admin/audit");
    return result;
  });
}

export async function uploadTemplateSignatureAction(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  return asClubAdmin(async (user) => {
    const file = formData.get("signature");
    if (!(file instanceof File)) {
      return { ok: false, error: "Signature image is required" };
    }
    return uploadTemplateSignature({
      clubId: user.clubId!,
      actorUserId: user.id,
      templateId: String(formData.get("templateId") || ""),
      signature: file,
    });
  });
}

export async function renameTemplateAction(formData: FormData): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const name = z.string().trim().min(2).safeParse(formData.get("name"));
    if (!name.success) return { ok: false, error: "Invalid name" };
    const result = await renameTemplate({
      clubId: user.clubId!,
      actorUserId: user.id,
      templateId: String(formData.get("id") || ""),
      name: name.data,
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    return result;
  });
}

export async function revertTemplateToDraftAction(
  formData: FormData,
): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const result = await revertTemplateToDraft({
      clubId: user.clubId!,
      actorUserId: user.id,
      templateId: String(formData.get("id") || ""),
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    revalidatePath("/admin/district");
    revalidatePath("/admin/audit");
    return result;
  });
}

export async function createFromGalleryAction(
  formData: FormData,
): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const result = await createFromGallery({
      clubId: user.clubId!,
      actorUserId: user.id,
      eventId: String(formData.get("eventId") || ""),
      galleryId: String(formData.get("galleryId") || ""),
      name: String(formData.get("name") || "").trim(),
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    revalidatePath("/admin");
    return result;
  });
}

export async function duplicateTemplateAction(
  formData: FormData,
): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
    const result = await duplicateTemplate({
      clubId: user.clubId!,
      actorUserId: user.id,
      templateId: String(formData.get("id") || ""),
    });
    if (!result.ok) return result;
    revalidatePath("/admin/templates");
    return result;
  });
}
