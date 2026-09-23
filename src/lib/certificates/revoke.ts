import {
  CertificateStatus,
  type PrismaClient,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireApprovedTemplate } from "@/lib/certificates/records";
import { tokenForCertificate } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";

export async function revokeCertificateRecord(
  input: {
    certificateId: string;
    clubId: string;
    actorUserId: string;
    reason: string;
  },
  tx: PrismaClient = prisma,
) {
  const cert = await tx.certificate.findFirst({
    where: { id: input.certificateId, clubId: input.clubId },
  });
  if (!cert) throw new Error("Certificate not found");
  if (cert.status === CertificateStatus.revoked) {
    return { alreadyRevoked: true as const, cert };
  }

  const updated = await tx.certificate.update({
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
    client: tx,
  });

  return {
    alreadyRevoked: false as const,
    cert,
    updated,
    previousPdfKey: cert.pdfKey,
  };
}

export async function prepareReissue(
  input: {
    certificateId: string;
    clubId: string;
  },
  tx: PrismaClient = prisma,
) {
  const cert = await tx.certificate.findFirst({
    where: { id: input.certificateId, clubId: input.clubId },
    include: {
      event: { select: { name: true } },
    },
  });
  if (!cert) throw new Error("Certificate not found");
  if (cert.status !== CertificateStatus.issued) {
    throw new Error("Only issued certificates can be reissued");
  }

  const template = await requireApprovedTemplate(cert.eventId, input.clubId, tx);
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

  const club = await tx.club.findUniqueOrThrow({
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

export async function commitReissue(
  input: {
    certificateId: string;
    clubId: string;
    actorUserId: string;
    verificationToken: string;
    tokenVersion: number;
    uniqueId: string;
    pdfUrl: string;
    pdfKey: string;
  },
  tx: PrismaClient = prisma,
) {
  const result = await tx.certificate.updateMany({
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

  const updated = await tx.certificate.findUniqueOrThrow({
    where: { id: input.certificateId },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "certificate.reissue",
    targetType: "Certificate",
    targetId: input.certificateId,
    clubId: input.clubId,
    metadata: { uniqueId: input.uniqueId, tokenVersion: input.tokenVersion },
    client: tx,
  });

  return updated;
}
