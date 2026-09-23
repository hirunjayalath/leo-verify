import { CertificateStatus } from "@/generated/prisma/client";
import {
  buildPdfDownloadPath,
  buildVerificationPath,
} from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import { getPublicEnv } from "@/lib/env";
import { resendCertificateEmail } from "@/lib/email/resend";

export const VERIFY_URL_CSV_PAGE_SIZE = 500;
export const VERIFY_URL_CSV_MAX_ROWS = 5000;
export const PDF_ZIP_MANIFEST_MAX = 500;

/** Next page after (createdAt desc, id desc) without Prisma id-only cursor. */
export function csvSeekWhere(cursor: { createdAt: Date; id: string }) {
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      {
        AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
      },
    ],
  };
}

export async function exportVerifyUrlsCsv(input: {
  clubId: string;
  eventId?: string;
}) {
  const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const lines = ["uniqueId,recipientName,recipientEmail,verifyUrl"];
  let cursor: { createdAt: Date; id: string } | undefined;
  let count = 0;

  while (count < VERIFY_URL_CSV_MAX_ROWS) {
    const take = Math.min(VERIFY_URL_CSV_PAGE_SIZE, VERIFY_URL_CSV_MAX_ROWS - count);
    const certs = await prisma.certificate.findMany({
      where: {
        clubId: input.clubId,
        status: CertificateStatus.issued,
        ...(input.eventId ? { eventId: input.eventId } : {}),
        ...(cursor ? csvSeekWhere(cursor) : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        uniqueId: true,
        recipientName: true,
        recipientEmail: true,
        verificationToken: true,
        createdAt: true,
      },
    });
    if (certs.length === 0) break;

    for (const c of certs) {
      const path = buildVerificationPath(c.uniqueId, c.verificationToken);
      const url = `${base}${path}`;
      lines.push(
        [
          c.uniqueId,
          JSON.stringify(c.recipientName),
          c.recipientEmail ?? "",
          url,
        ].join(","),
      );
    }
    count += certs.length;
    const last = certs[certs.length - 1]!;
    cursor = { createdAt: last.createdAt, id: last.id };
    if (certs.length < take) break;
  }

  return { ok: true as const, csv: lines.join("\n"), count };
}

export async function resendIssuedCertificateEmail(input: {
  clubId: string;
  certificateId: string;
}) {
  const cert = await prisma.certificate.findFirst({
    where: { id: input.certificateId, clubId: input.clubId },
    include: {
      event: { select: { name: true } },
    },
  });
  if (!cert) return { ok: false as const, error: "Not found" };
  if (!cert.recipientEmail) {
    return { ok: false as const, error: "No recipient email" };
  }
  if (cert.status !== CertificateStatus.issued) {
    return { ok: false as const, error: "Only issued certificates can be resent" };
  }
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });
  const sent = await resendCertificateEmail({
    to: cert.recipientEmail,
    recipientName: cert.recipientName,
    eventName: cert.event.name,
    clubName: club.name,
    uniqueId: cert.uniqueId,
    verificationToken: cert.verificationToken,
    clubLogoUrl: club.logoUrl,
    primaryColor: club.primaryColor,
    accentColor: club.accentColor,
  });
  if (!sent.sent) {
    return {
      ok: false as const,
      error: sent.error ?? "Email send failed",
    };
  }
  return { ok: true as const };
}

export async function buildPdfZipManifest(input: {
  clubId: string;
  eventId?: string;
}) {
  const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const certs = await prisma.certificate.findMany({
    where: {
      clubId: input.clubId,
      status: CertificateStatus.issued,
      ...(input.eventId ? { eventId: input.eventId } : {}),
      OR: [{ pdfKey: { not: null } }, { pdfUrl: { not: null } }],
    },
    take: PDF_ZIP_MANIFEST_MAX,
    select: {
      uniqueId: true,
      verificationToken: true,
    },
  });

  const files = certs.map((c) => ({
    name: `${c.uniqueId}.pdf`,
    url: `${base}${buildPdfDownloadPath(c.uniqueId, c.verificationToken)}`,
  }));
  return { ok: true as const, files, count: files.length };
}
