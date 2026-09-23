import { assertWithinCertLimit } from "@/lib/certificates/limits";
import {
  CertificateStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { formatCertificateId } from "@/lib/certificates/id";
import { tokenForCertificate } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import { logOps } from "@/lib/observability";

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
  backgroundBytes?: Uint8Array;
};

export type IssueCertificateResult = {
  id: string;
  uniqueId: string;
  verificationToken: string;
  pdfUrl: string | null;
  skipped?: boolean;
  emailSent?: boolean;
};

export type CreatedCertificateRow = {
  id: string;
  uniqueId: string;
  verificationToken: string;
  recipientName: string;
  recipientEmail: string | null;
  role: string;
  achievement: string | null;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function existingMaxSequence(clubId: string, year: number): Promise<number> {
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { code: true },
  });
  const prefix = `LEO-${club.code.toUpperCase()}-${year}-`;
  const latest = await prisma.certificate.findFirst({
    where: { clubId, uniqueId: { startsWith: prefix } },
    orderBy: { uniqueId: "desc" },
    select: { uniqueId: true },
  });
  if (!latest) return 0;
  const seq = Number(latest.uniqueId.slice(-6));
  return Number.isFinite(seq) ? seq : 0;
}

async function allocateSequence(clubId: string, year: number): Promise<number> {
  const floor = await existingMaxSequence(clubId, year);
  const rows = await prisma.$queryRaw<Array<{ next: number }>>`
    INSERT INTO "ClubCertSequence" ("clubId", "year", "next")
    VALUES (${clubId}, ${year}, ${floor + 1})
    ON CONFLICT ("clubId", "year")
    DO UPDATE SET "next" = GREATEST(
      "ClubCertSequence"."next" + 1,
      ${floor + 1}
    )
    RETURNING "next"
  `;
  const next = rows[0]?.next;
  if (!next) throw new Error("Could not allocate a certificate sequence");
  return next;
}

function tokenFromRow(row: {
  uniqueId: string;
  recipientName: string;
  eventId: string;
  clubId: string;
  issueDate: Date;
  role: string;
  tokenVersion?: number | null;
}) {
  return tokenForCertificate(row);
}

export async function requireApprovedTemplate(eventId: string, clubId: string) {
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

export type CreateCertificateRecordResult =
  | { skipped: true; result: IssueCertificateResult }
  | {
      skipped: false;
      certificate: CreatedCertificateRow;
      uniqueId: string;
      verificationToken: string;
      issueDateIso: string;
      template: Awaited<ReturnType<typeof requireApprovedTemplate>>;
      club: {
        id: string;
        name: string;
        logoUrl: string | null;
        primaryColor: string;
        accentColor: string;
        code: string;
      };
      event: { id: string; name: string };
    };

export async function createCertificateRecord(
  input: IssueCertificateInput,
): Promise<CreateCertificateRecordResult> {
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
      skipped: true,
      result: {
        id: existing.id,
        uniqueId: existing.uniqueId,
        verificationToken: tokenFromRow(existing),
        pdfUrl: existing.pdfUrl,
        skipped: true,
      },
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

  let certificate: CreatedCertificateRow | undefined;
  let uniqueId = "";
  let verificationToken = "";

  for (let attempt = 0; attempt < 8; attempt++) {
    const sequence = await allocateSequence(input.clubId, year);
    uniqueId = formatCertificateId(club.code, year, sequence);
    verificationToken = tokenForCertificate({
      uniqueId,
      recipientName,
      eventId: input.eventId,
      clubId: input.clubId,
      issueDate: issueDateIso,
      role,
      tokenVersion,
    });

    try {
      const created = await prisma.certificate.create({
        data: {
          uniqueId,
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
      certificate = {
        id: created.id,
        uniqueId: created.uniqueId,
        verificationToken,
        recipientName: created.recipientName,
        recipientEmail: created.recipientEmail,
        role: created.role,
        achievement: created.achievement,
      };
      break;
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced = await findIssuedDuplicate({
          eventId: input.eventId,
          recipientName,
          recipientEmail,
        });
        if (raced) {
          return {
            skipped: true,
            result: {
              id: raced.id,
              uniqueId: raced.uniqueId,
              verificationToken: tokenFromRow(raced),
              pdfUrl: raced.pdfUrl,
              skipped: true,
            },
          };
        }
        const takenId = await prisma.certificate.findUnique({
          where: { uniqueId },
          select: { id: true },
        });
        if (takenId) {
          logOps("certificate.sequence_collision", {
            clubId: input.clubId,
            attempt,
          });
          continue;
        }
        throw error;
      }
      throw error;
    }
  }

  if (!certificate) {
    logOps("certificate.allocate_failed", { clubId: input.clubId });
    throw new Error("Could not allocate a unique certificate ID. Try again.");
  }

  return {
    skipped: false,
    certificate,
    uniqueId,
    verificationToken,
    issueDateIso,
    template,
    club,
    event,
  };
}

export async function attachCertificatePdf(input: {
  certificateId: string;
  pdfUrl: string;
  pdfKey: string;
}): Promise<void> {
  await prisma.certificate.update({
    where: { id: input.certificateId },
    data: { pdfUrl: input.pdfUrl, pdfKey: input.pdfKey },
  });
}

export async function auditCertificateIssue(input: {
  actorUserId: string;
  certificateId: string;
  clubId: string;
  uniqueId: string;
  recipientName: string;
  eventId: string;
}): Promise<void> {
  await writeAuditLog({
    actorUserId: input.actorUserId === "system" ? null : input.actorUserId,
    action: "certificate.issue",
    targetType: "Certificate",
    targetId: input.certificateId,
    clubId: input.clubId,
    metadata: {
      uniqueId: input.uniqueId,
      recipientName: input.recipientName,
      eventId: input.eventId,
    },
  });
}

export async function revokeCertificateRecord(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
  reason: string;
}) {
  const cert = await prisma.certificate.findFirst({
    where: { id: input.certificateId, clubId: input.clubId },
  });
  if (!cert) throw new Error("Certificate not found");
  if (cert.status === CertificateStatus.revoked) {
    return { alreadyRevoked: true as const, cert };
  }

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

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "certificate.revoke",
    targetType: "Certificate",
    targetId: cert.id,
    clubId: input.clubId,
    metadata: { reason: input.reason, uniqueId: cert.uniqueId },
  });

  return {
    alreadyRevoked: false as const,
    cert,
    updated,
    previousPdfKey: cert.pdfKey,
  };
}

export async function prepareReissue(input: {
  certificateId: string;
  clubId: string;
}) {
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
  const verificationToken = tokenForCertificate({
    uniqueId: cert.uniqueId,
    recipientName: cert.recipientName,
    eventId: cert.eventId,
    clubId: input.clubId,
    issueDate: issueDateIso,
    role: cert.role,
    tokenVersion,
  });

  const club = await prisma.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });

  return { cert, template, issueDateIso, tokenVersion, verificationToken, club };
}

export function reissueCommitWhere(input: {
  certificateId: string;
  clubId: string;
}) {
  return {
    id: input.certificateId,
    clubId: input.clubId,
    status: CertificateStatus.issued,
  };
}

export async function commitReissue(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
  verificationToken: string;
  tokenVersion: number;
  uniqueId: string;
  pdfUrl: string;
  pdfKey: string;
}) {
  const result = await prisma.certificate.updateMany({
    where: reissueCommitWhere({
      certificateId: input.certificateId,
      clubId: input.clubId,
    }),
    data: {
      tokenVersion: input.tokenVersion,
      pdfUrl: input.pdfUrl,
      pdfKey: input.pdfKey,
    },
  });
  if (result.count === 0) return null;

  const updated = await prisma.certificate.findUniqueOrThrow({
    where: { id: input.certificateId },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "certificate.reissue",
    targetType: "Certificate",
    targetId: input.certificateId,
    clubId: input.clubId,
    metadata: { uniqueId: input.uniqueId, tokenVersion: input.tokenVersion },
  });

  return updated;
}
