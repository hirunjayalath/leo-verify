import { assertWithinCertLimit } from "@/lib/certificates/limits";
import {
  CertificateStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { formatCertificateId } from "@/lib/certificates/id";
import { renderCertificatePdf } from "@/lib/certificates/render-pdf";
import {
  buildPdfDownloadPath,
  computeVerificationToken,
} from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import { sendCertificateEmail } from "@/lib/email/resend";
import { buildObjectKey, deleteObject, uploadObject } from "@/lib/storage/r2";

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
  emailSent?: boolean;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

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

async function requireApprovedTemplate(eventId: string, clubId: string) {
  const template = await prisma.certificateTemplate.findFirst({
    where: {
      eventId,
      clubId,
      status: TemplateStatus.approved,
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!template) {
    throw new Error(
      "No approved template for this event. Approve a template before issuing.",
    );
  }
  return template;
}

async function findIssuedDuplicate(input: {
  eventId: string;
  recipientName: string;
  recipientEmail: string | null;
}) {
  if (input.recipientEmail) {
    return prisma.certificate.findFirst({
      where: {
        eventId: input.eventId,
        recipientEmail: {
          equals: input.recipientEmail,
          mode: "insensitive",
        },
        recipientName: input.recipientName,
        status: CertificateStatus.issued,
      },
    });
  }
  return prisma.certificate.findFirst({
    where: {
      eventId: input.eventId,
      recipientName: input.recipientName,
      recipientEmail: null,
      status: CertificateStatus.issued,
    },
  });
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
  });
  if (!event) throw new Error("Event not found for club");

  const template = await requireApprovedTemplate(input.eventId, input.clubId);

  const recipientName = input.recipientName.trim();
  const recipientEmail = input.recipientEmail?.trim().toLowerCase() || null;
  const role = input.role.trim();

  const existing = await findIssuedDuplicate({
    eventId: input.eventId,
    recipientName,
    recipientEmail,
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

  await assertWithinCertLimit(input.clubId);

  let recipientId: string | null = null;
  if (recipientEmail) {
    const recipient = await prisma.recipient.findFirst({
      where: { email: { equals: recipientEmail, mode: "insensitive" } },
      select: { id: true },
    });
    recipientId = recipient?.id ?? null;
  }

  const issueDateIso = issueDate.toISOString().slice(0, 10);
  const tokenVersion = 1;

  let certificate:
    | {
        id: string;
        uniqueId: string;
        verificationToken: string;
        recipientName: string;
        recipientEmail: string | null;
        role: string;
        achievement: string | null;
      }
    | undefined;
  let uniqueId = "";
  let verificationToken = "";

  for (let attempt = 0; attempt < 5; attempt++) {
    const sequence = await nextSequence(input.clubId, year);
    uniqueId = formatCertificateId(club.code, year, sequence);
    verificationToken = computeVerificationToken({
      uniqueId,
      recipientName,
      eventId: input.eventId,
      clubId: input.clubId,
      issueDate: issueDateIso,
      role,
      tokenVersion,
    });

    try {
      certificate = await prisma.certificate.create({
        data: {
          uniqueId,
          verificationToken,
          tokenVersion,
          clubId: input.clubId,
          eventId: input.eventId,
          recipientName,
          recipientEmail,
          role,
          achievement: input.achievement?.trim() || null,
          issueDate,
          status: CertificateStatus.issued,
          recipientId,
        },
      });
      break;
    } catch (error) {
      if (isUniqueViolation(error)) {
        // Another concurrent issue may have claimed this uniqueId or person — re-check duplicate
        const raced = await findIssuedDuplicate({
          eventId: input.eventId,
          recipientName,
          recipientEmail,
        });
        if (raced) {
          return {
            id: raced.id,
            uniqueId: raced.uniqueId,
            verificationToken: raced.verificationToken,
            pdfUrl: raced.pdfUrl,
            skipped: true,
          };
        }
        continue;
      }
      throw error;
    }
  }

  if (!certificate) {
    throw new Error("Could not allocate a unique certificate ID. Try again.");
  }

  let pdfUrl: string | null = null;
  let pdfKey: string | null = null;
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
  pdfKey = uploaded.key;
  await prisma.certificate.update({
    where: { id: certificate.id },
    data: { pdfUrl, pdfKey },
  });

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

  let emailSent = false;
  if (input.sendEmail !== false && certificate.recipientEmail) {
    const emailResult = await sendCertificateEmail({
      to: certificate.recipientEmail,
      recipientName: certificate.recipientName,
      uniqueId: certificate.uniqueId,
      verificationToken: certificate.verificationToken,
      eventName: event.name,
      clubName: club.name,
      pdfUrl: buildPdfDownloadPath(
        certificate.uniqueId,
        certificate.verificationToken,
      ),
    });
    emailSent = emailResult.sent;
  }

  return {
    id: certificate.id,
    uniqueId,
    verificationToken,
    pdfUrl,
    emailSent,
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
      pdfUrl: null,
      pdfKey: null,
    },
  });

  if (cert.pdfKey) {
    try {
      await deleteObject(cert.pdfKey);
    } catch {
      /* best-effort; gated route already refuses revoked */
    }
  }

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

/** New verification token + PDF; status stays issued. Does not revoke. */
export async function reissueCertificate(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
}): Promise<IssueCertificateResult> {
  const cert = await prisma.certificate.findFirst({
    where: { id: input.certificateId, clubId: input.clubId },
    include: {
      event: { select: { name: true } },
    },
  });
  if (!cert) throw new Error("Certificate not found");
  if (cert.status !== CertificateStatus.issued) {
    throw new Error("Only issued certificates can be reissued");
  }

  const template = await requireApprovedTemplate(cert.eventId, input.clubId);
  const issueDateIso = cert.issueDate.toISOString().slice(0, 10);
  const tokenVersion = (cert.tokenVersion ?? 1) + 1;
  const verificationToken = computeVerificationToken({
    uniqueId: cert.uniqueId,
    recipientName: cert.recipientName,
    eventId: cert.eventId,
    clubId: input.clubId,
    issueDate: issueDateIso,
    role: cert.role,
    tokenVersion,
  });

  const pdfBytes = await renderCertificatePdf({
    backgroundUrl: template.backgroundUrl,
    layout: template.layout,
    recipientName: cert.recipientName,
    role: cert.role,
    issueDate: issueDateIso,
    uniqueId: cert.uniqueId,
    verificationToken,
    achievement: cert.achievement,
  });
  const uploaded = await uploadObject({
    key: buildObjectKey("certificates", input.clubId, "pdf"),
    body: Buffer.from(pdfBytes),
    contentType: "application/pdf",
  });

  if (cert.pdfKey && cert.pdfKey !== uploaded.key) {
    try {
      await deleteObject(cert.pdfKey);
    } catch {
      /* ignore */
    }
  }

  const updated = await prisma.certificate.update({
    where: { id: cert.id },
    data: {
      verificationToken,
      tokenVersion,
      pdfUrl: uploaded.url,
      pdfKey: uploaded.key,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "certificate.reissue",
    targetType: "Certificate",
    targetId: cert.id,
    clubId: input.clubId,
    metadata: { uniqueId: cert.uniqueId, tokenVersion },
  });

  return {
    id: updated.id,
    uniqueId: updated.uniqueId,
    verificationToken: updated.verificationToken,
    pdfUrl: updated.pdfUrl,
  };
}
