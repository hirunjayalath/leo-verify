import { CertificateStatus } from "@/generated/prisma/client";
import { evaluateVerification } from "@/lib/certificates/verify";
import { prisma } from "@/lib/db";

/** Shared lookup for /v pages and token-aware Open Graph cards. */
export async function lookupCertificateForVerify(uniqueId: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const row = await prisma.certificate.findUnique({
      where: { uniqueId },
      select: {
        uniqueId: true,
        verificationToken: true,
        recipientName: true,
        role: true,
        achievement: true,
        issueDate: true,
        status: true,
        clubId: true,
        eventId: true,
        pdfUrl: true,
        pdfKey: true,
        tokenVersion: true,
        event: {
          select: {
            name: true,
            club: { select: { name: true } },
          },
        },
      },
    });

    if (!row) return null;

    return {
      uniqueId: row.uniqueId,
      verificationToken: row.verificationToken,
      recipientName: row.recipientName,
      role: row.role,
      achievement: row.achievement,
      issueDate: row.issueDate,
      status: row.status,
      clubId: row.clubId,
      eventId: row.eventId,
      clubName: row.event.club.name,
      eventName: row.event.name,
      pdfUrl: row.pdfUrl,
      pdfKey: row.pdfKey,
      tokenVersion: row.tokenVersion,
    };
  } catch {
    return null;
  }
}

/** Public card data only when token verifies and status is issued. */
export async function getVerifiedShareCard(
  uniqueId: string,
  token: string | null | undefined,
) {
  const row = await lookupCertificateForVerify(uniqueId);
  const result = evaluateVerification(row, token);
  if (result.status !== "valid") return null;
  if (row?.status === CertificateStatus.revoked) return null;
  return {
    recipientName: result.recipientName,
    eventName: result.eventName,
    clubName: result.clubName,
    role: result.role,
    issueDate: result.issueDate,
    uniqueId: result.uniqueId,
  };
}
