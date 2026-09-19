import { TemplateStatus, ClubType } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  DEFAULT_LAYOUT,
  templateLayoutSchema,
} from "@/lib/certificates/layout";
import { sniffImageBytes } from "@/lib/certificates/image-sniff";
import { prisma } from "@/lib/db";
import { buildObjectKey, uploadObject } from "@/lib/storage/r2";
import { galleryById } from "@/lib/templates/gallery";

export type TemplateServiceResult =
  | { ok: true; id?: string; url?: string }
  | { ok: false; error: string };

function approvalStatus(clubType: ClubType): TemplateStatus {
  return clubType === ClubType.public
    ? TemplateStatus.draft
    : TemplateStatus.approved;
}

export async function createTemplate(input: {
  clubId: string;
  actorUserId: string;
  eventId: string;
  name: string;
  background: File;
}): Promise<TemplateServiceResult> {
  if (!input.eventId || input.name.length < 2) {
    return { ok: false, error: "Event and template name are required" };
  }
  if (!(input.background instanceof File) || input.background.size === 0) {
    return { ok: false, error: "Background image is required" };
  }
  if (input.background.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Image must be 5 MB or smaller" };
  }

  const event = await prisma.event.findFirst({
    where: { id: input.eventId, clubId: input.clubId },
  });
  if (!event) return { ok: false, error: "Event not found" };

  const club = await prisma.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });

  const bytes = Buffer.from(await input.background.arrayBuffer());
  const sniffed = sniffImageBytes(bytes);
  if (!sniffed.ok) return { ok: false, error: sniffed.error };

  const key = buildObjectKey("templates", input.clubId, sniffed.ext);
  const uploaded = await uploadObject({
    key,
    body: bytes,
    contentType: sniffed.contentType,
  });

  const status = approvalStatus(club.type);
  const template = await prisma.certificateTemplate.create({
    data: {
      eventId: input.eventId,
      clubId: input.clubId,
      name: input.name,
      backgroundUrl: uploaded.url,
      layout: DEFAULT_LAYOUT,
      status,
      createdById: input.actorUserId,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.create",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId: input.clubId,
    metadata: { name: input.name, eventId: input.eventId, status },
  });

  if (status === TemplateStatus.approved) {
    await writeAuditLog({
      actorUserId: input.actorUserId,
      action: "template.approve",
      targetType: "CertificateTemplate",
      targetId: template.id,
      clubId: input.clubId,
      metadata: { auto: true },
    });
  }

  return { ok: true, id: template.id };
}

export async function approveOwnTemplate(input: {
  clubId: string;
  actorUserId: string;
  templateId: string;
}): Promise<TemplateServiceResult> {
  if (!input.templateId) return { ok: false, error: "Template id required" };

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId: input.clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id: input.templateId },
    data: {
      status: TemplateStatus.approved,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.approve",
    targetType: "CertificateTemplate",
    targetId: input.templateId,
    clubId: input.clubId,
  });

  return { ok: true, id: input.templateId };
}

export async function saveTemplateLayout(input: {
  clubId: string;
  actorUserId: string;
  templateId: string;
  layout: unknown;
}): Promise<TemplateServiceResult> {
  const parsed = templateLayoutSchema.safeParse(input.layout);
  if (!parsed.success) {
    return { ok: false, error: "Invalid layout JSON" };
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId: input.clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id: template.id },
    data: {
      layout: parsed.data,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.update",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId: input.clubId,
    metadata: { fields: parsed.data.length },
  });

  return { ok: true, id: template.id };
}

export async function uploadTemplateSignature(input: {
  clubId: string;
  actorUserId: string;
  templateId: string;
  signature: File;
}): Promise<TemplateServiceResult> {
  if (!input.templateId) return { ok: false, error: "Template id required" };
  if (!(input.signature instanceof File) || input.signature.size === 0) {
    return { ok: false, error: "Signature image is required" };
  }
  if (input.signature.size > 2 * 1024 * 1024) {
    return { ok: false, error: "Signature must be 2 MB or smaller" };
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId: input.clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  const bytes = Buffer.from(await input.signature.arrayBuffer());
  const sniffed = sniffImageBytes(bytes);
  if (!sniffed.ok) return { ok: false, error: sniffed.error };

  const key = buildObjectKey("signatures", input.clubId, sniffed.ext);
  const uploaded = await uploadObject({
    key,
    body: bytes,
    contentType: sniffed.contentType,
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.signature.upload",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId: input.clubId,
    metadata: { key },
  });

  return { ok: true, id: template.id, url: uploaded.url };
}

export async function renameTemplate(input: {
  clubId: string;
  actorUserId: string;
  templateId: string;
  name: string;
}): Promise<TemplateServiceResult> {
  if (!input.templateId || input.name.trim().length < 2) {
    return { ok: false, error: "Invalid name" };
  }

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId: input.clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id: input.templateId },
    data: { name: input.name.trim(), lastEditedById: input.actorUserId },
  });

  return { ok: true, id: input.templateId };
}

export async function revertTemplateToDraft(input: {
  clubId: string;
  actorUserId: string;
  templateId: string;
}): Promise<TemplateServiceResult> {
  if (!input.templateId) return { ok: false, error: "Template id required" };

  const template = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId: input.clubId },
  });
  if (!template) return { ok: false, error: "Template not found" };
  if (template.status !== TemplateStatus.rejected) {
    return { ok: false, error: "Only rejected templates can be reverted" };
  }

  await prisma.certificateTemplate.update({
    where: { id: input.templateId },
    data: {
      status: TemplateStatus.draft,
      reviewNote: null,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.revert",
    targetType: "CertificateTemplate",
    targetId: input.templateId,
    clubId: input.clubId,
  });

  return { ok: true, id: input.templateId };
}

export async function createFromGallery(input: {
  clubId: string;
  actorUserId: string;
  eventId: string;
  galleryId: string;
  name: string;
}): Promise<TemplateServiceResult> {
  const preset = galleryById(input.galleryId);
  if (!preset) return { ok: false, error: "Gallery template not found" };
  if (!input.eventId) return { ok: false, error: "Event is required" };

  const event = await prisma.event.findFirst({
    where: { id: input.eventId, clubId: input.clubId },
  });
  if (!event) return { ok: false, error: "Event not found" };

  const club = await prisma.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const rel = preset.backgroundPath.replace(/^\//, "");
  const bytes = await readFile(join(process.cwd(), "public", rel));
  const sniffed = sniffImageBytes(bytes);
  if (!sniffed.ok) return { ok: false, error: sniffed.error };

  const key = buildObjectKey("templates", input.clubId, sniffed.ext);
  const uploaded = await uploadObject({
    key,
    body: bytes,
    contentType: sniffed.contentType,
  });

  const status = approvalStatus(club.type);
  const template = await prisma.certificateTemplate.create({
    data: {
      eventId: input.eventId,
      clubId: input.clubId,
      name: input.name || preset.name,
      backgroundUrl: uploaded.url,
      layout: preset.layout,
      pageSize: "a4_landscape",
      status,
      createdById: input.actorUserId,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.create",
    targetType: "CertificateTemplate",
    targetId: template.id,
    clubId: input.clubId,
    metadata: { galleryId: input.galleryId, eventId: input.eventId, status },
  });

  return { ok: true, id: template.id };
}

export async function duplicateTemplate(input: {
  clubId: string;
  actorUserId: string;
  templateId: string;
}): Promise<TemplateServiceResult> {
  if (!input.templateId) return { ok: false, error: "Template id required" };

  const source = await prisma.certificateTemplate.findFirst({
    where: { id: input.templateId, clubId: input.clubId },
  });
  if (!source) return { ok: false, error: "Template not found" };

  const club = await prisma.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });
  const status = approvalStatus(club.type);

  const copy = await prisma.certificateTemplate.create({
    data: {
      eventId: source.eventId,
      clubId: input.clubId,
      name: `${source.name} (copy)`,
      backgroundUrl: source.backgroundUrl,
      layout: source.layout as object,
      pageSize: source.pageSize,
      status,
      createdById: input.actorUserId,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "template.duplicate",
    targetType: "CertificateTemplate",
    targetId: copy.id,
    clubId: input.clubId,
    metadata: { from: source.id },
  });

  return { ok: true, id: copy.id };
}
