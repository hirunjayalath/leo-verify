import { cache } from "react";
import { CertificateStatus } from "@/generated/prisma/client";
import { parseCertificateId } from "@/lib/certificates/id";
import { evaluateVerification } from "@/lib/certificates/verify";
import type { CertificateLookupRow } from "@/lib/certificates/pure/verify";
import { prismaService } from "@/lib/db";
import { logOps } from "@/lib/observability";
import { rateLimitVerification } from "@/lib/rate-limit";

/** Uncached query — used by tests and wrapped in cache() for one read per request. */
export async function lookupCertificateForVerifyQuery(uniqueId: string) {
  if (!parseCertificateId(uniqueId)) return null;
  if (!process.env.DATABASE_URL) return null;

  let row;
  try {
    row = await prismaService.certificate.findUnique({
      where: { uniqueId },
      select: {
        uniqueId: true,
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
            club: {
              select: {
                name: true,
                logoUrl: true,
                primaryColor: true,
                accentColor: true,
                publicSlug: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    logOps("verify.lookup_failed", {
      uniqueId,
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }

  if (!row) return null;

  return {
    uniqueId: row.uniqueId,
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
    clubLogoUrl: row.event.club.logoUrl,
    primaryColor: row.event.club.primaryColor,
    accentColor: row.event.club.accentColor,
    publicSlug: row.event.club.publicSlug,
  };
}

/** Request-scoped memo — metadata + page share one live DB read. */
export const lookupCertificateForVerify = cache(lookupCertificateForVerifyQuery);

export type PublicVerificationLoad =
  | { kind: "limited" }
  | { kind: "unavailable" }
  | { kind: "ready"; row: CertificateLookupRow | null };

/** Rate-limit then look up once. Metadata and the page share this via cache(). */
export async function loadPublicVerificationQuery(
  uniqueId: string,
  ip: string,
): Promise<PublicVerificationLoad> {
  const limit = await rateLimitVerification(ip);
  if (!limit.success) return { kind: "limited" };
  try {
    const row = await lookupCertificateForVerifyQuery(uniqueId);
    return { kind: "ready", row };
  } catch {
    return { kind: "unavailable" };
  }
}

export const loadPublicVerification = cache(loadPublicVerificationQuery);

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
    clubLogoUrl: row?.clubLogoUrl ?? null,
    primaryColor: row?.primaryColor ?? "#323232",
    accentColor: row?.accentColor ?? "#38a3e3",
  };
}
