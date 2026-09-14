"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TemplateStatus } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireClubAdmin } from "@/lib/auth";
import {
  DEFAULT_LAYOUT,
  templateLayoutSchema,
} from "@/lib/certificates/layout";
import { prisma } from "@/lib/db";
import { buildObjectKey, uploadObject } from "@/lib/storage/r2";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createTemplateAction(formData: FormData): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const eventId = String(formData.get("eventId") || "");
  const name = String(formData.get("name") || "").trim();
  const file = formData.get("background");

  if (!eventId || name.length < 2) {
    return { ok: false, error: "Event and template name are required" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Background image is required" };
  }

  const event = await prisma.event.findFirst({ where: { id: eventId, clubId } });
  if (!event) return { ok: false, error: "Event not found" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : "jpg";
  const key = buildObjectKey("templates", clubId, ext);
  const uploaded = await uploadObject({
    key,
    body: bytes,
    contentType: file.type || "image/jpeg",
  });

  // Club-created templates are auto-approved so UoM can issue immediately.
  // District review still applies to drafts; clubs can also submit drafts later.
  const template = await prisma.certificateTemplate.create({
    data: {
      eventId,
      clubId,
      name,
      backgroundUrl: uploaded.url,
      layout: DEFAULT_LAYOUT,
      status: TemplateStatus.approved,
      createdById: user.id,
      lastEditedById: user.id,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "template.create",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId,
    metadata: { name, eventId, status: TemplateStatus.approved },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "template.approve",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId,
    metadata: { auto: true },
  });

  revalidatePath("/admin/templates");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  return { ok: true, id: template.id };
}

export async function approveOwnTemplateAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Template id required" };

  const template = await prisma.certificateTemplate.findFirst({
    where: { id, clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id },
    data: {
      status: TemplateStatus.approved,
      lastEditedById: user.id,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "template.approve",
    targetType: "CertificateTemplate",
    targetId: id,
    clubId,
  });

  revalidatePath("/admin/templates");
  revalidatePath("/admin/district");
  revalidatePath("/admin/audit");
  return { ok: true, id };
}

export async function saveTemplateLayoutAction(input: {
  templateId: string;
  layout: unknown;
}): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const parsed = templateLayoutSchema.safeParse(input.layout);
  if (!parsed.success) {
    return { ok: false, error: "Invalid layout JSON" };
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id: template.id },
    data: {
      layout: parsed.data,
      lastEditedById: user.id,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "template.update",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId,
    metadata: { fields: parsed.data.length },
  });

  revalidatePath(`/admin/templates/${template.id}/edit`);
  revalidatePath("/admin/templates");
  revalidatePath("/admin/audit");
  return { ok: true, id: template.id };
}

export async function renameTemplateAction(formData: FormData): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const id = String(formData.get("id") || "");
  const name = z.string().trim().min(2).safeParse(formData.get("name"));
  if (!id || !name.success) return { ok: false, error: "Invalid name" };

  const template = await prisma.certificateTemplate.findFirst({
    where: { id, clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id },
    data: { name: name.data, lastEditedById: user.id },
  });

  revalidatePath("/admin/templates");
  return { ok: true, id };
}
