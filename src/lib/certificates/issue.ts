import { CertificateStatus } from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { formatCertificateId } from "@/lib/certificates/id";
import { renderCertificatePdf } from "@/lib/certificates/render-pdf";
import { computeVerificationToken } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import { buildObjectKey, uploadObject } from "@/lib/storage/r2";

export type IssueCertificateInput = {
  eventId: string;
  clubId: string;
  actorUserId: string;
  recipientName: string;
  recipientEmail?: string | null;
  role: string;
  achievement?: string | null;
  issueDate?: Date;
  sendEmail?: boolean;
};

export type IssueCertificateResult = {
  id: string;
  uniqueId: string;
  verificationToken: string;
  pdfUrl: string | null;
  skipped?: boolean;
};

async function nextSequence(clubId: string, year: number): Promise<number> {
  const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
  const prefix = `LEO-${club.code.toUpperCase()}-${year}-`;
  const latest = await prisma.certificate.findFirst({
    where: { clubId, uniqueId: { startsWith: prefix } },
    orderBy: { uniqueId: "desc" },
    select: { uniqueId: true },
  });
  if (!latest) return 1;
  const seq = Number(latest.uniqueId.slice(-6));
  return Number.isFinite(seq) ? seq + 1 : 1;
}

export async function issueCertificate(
  input: IssueCertificateInput,
): Promise<IssueCertificateResult> {
  const issueDate = input.issueDate ?? new Date();
  const year = issueDate.getUTCFullYear();
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });
  const event = await prisma.event.findFirst({
    where: { id: input.eventId, clubId: input.clubId },
    include: {
      templates: { orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (!event) throw new Error("Event not found for club");

  if (input.recipientEmail) {
    const existing = await prisma.certificate.findFirst({
      where: {
        eventId: input.eventId,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName.trim(),
        status: CertificateStatus.issued,
      },
    });
    if (existing) {
      return {
        id: existing.id,
        uniqueId: existing.uniqueId,
        verificationToken: existing.verificationToken,
        pdfUrl: existing.pdfUrl,
        skipped: true,
      };
    }
  }

  const sequence = await nextSequence(input.clubId, year);
  const uniqueId = formatCertificateId(club.code, year, sequence);
  const issueDateIso = issueDate.toISOString().slice(0, 10);
  const verificationToken = computeVerificationToken({
    uniqueId,
    recipientName: input.recipientName.trim(),
    eventId: input.eventId,
    clubId: input.clubId,
    issueDate: issueDateIso,
    role: input.role.trim(),
  });

  const certificate = await prisma.certificate.create({
    data: {
      uniqueId,
      verificationToken,
      clubId: input.clubId,
      eventId: input.eventId,
      recipientName: input.recipientName.trim(),
      recipientEmail: input.recipientEmail?.trim() || null,
      role: input.role.trim(),
      achievement: input.achievement?.trim() || null,
      issueDate,
      status: CertificateStatus.issued,
    },
  });

  let pdfUrl: string | null = null;
  const template = event.templates[0];
  if (template) {
    const pdfBytes = await renderCertificatePdf({
      backgroundUrl: template.backgroundUrl,
      layout: template.layout,
      recipientName: certificate.recipientName,
      role: certificate.role,
      issueDate: issueDateIso,
      uniqueId: certificate.uniqueId,
      verificationToken: certificate.verificationToken,
      achievement: certificate.achievement,
    });
    const uploaded = await uploadObject({
      key: buildObjectKey("certificates", input.clubId, "pdf"),
      body: Buffer.from(pdfBytes),
      contentType: "application/pdf",
    });
    pdfUrl = uploaded.url;
    await prisma.certificate.update({
      where: { id: certificate.id },
      data: { pdfUrl },
    });
  }

  await writeAuditLog({
    actorUserId: input.actorUserId === "system" ? null : input.actorUserId,
    action: "certificate.issue",
    targetType: "Certificate",
    targetId: certificate.id,
    clubId: input.clubId,
    metadata: {
      uniqueId,
      recipientName: certificate.recipientName,
      eventId: input.eventId,
    },
  });

  return {
    id: certificate.id,
    uniqueId,
    verificationToken,
    pdfUrl,
  };
}

export async function revokeCertificate(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
  reason: string;
}) {
  const cert = await prisma.certificate.findFirst({
    where: { id: input.certificateId, clubId: input.clubId },
  });
  if (!cert) throw new Error("Certificate not found");
  if (cert.status === CertificateStatus.revoked) return cert;

  const updated = await prisma.certificate.update({
    where: { id: cert.id },
    data: {
      status: CertificateStatus.revoked,
      revokedReason: input.reason,
      revokedAt: new Date(),
      revokedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "certificate.revoke",
    targetType: "Certificate",
    targetId: cert.id,
    clubId: input.clubId,
    metadata: { reason: input.reason, uniqueId: cert.uniqueId },
  });

  return updated;
}
