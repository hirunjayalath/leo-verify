"use server";

import { CertificateStatus } from "@/generated/prisma/client";
import { requireClubAdmin } from "@/lib/auth";
import {
  buildPdfDownloadPath,
  buildVerificationPath,
} from "@/lib/certificates/token";
import { prisma } from "@/lib/db";
import { getPublicEnv } from "@/lib/env";
import { resendCertificateEmail } from "@/lib/email/resend";
import { getShortLivedObjectUrl } from "@/lib/storage/r2";

export async function exportVerifyUrlsCsvAction(eventId?: string) {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const certs = await prisma.certificate.findMany({
    where: {
      clubId,
      status: CertificateStatus.issued,
      ...(eventId ? { eventId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: {
      uniqueId: true,
      recipientName: true,
      recipientEmail: true,
      verificationToken: true,
    },
  });
  const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const lines = [
    "uniqueId,recipientName,recipientEmail,verifyUrl",
    ...certs.map((c) => {
      const path = buildVerificationPath(c.uniqueId, c.verificationToken);
      const url = `${base}${path}`;
      return [
        c.uniqueId,
        JSON.stringify(c.recipientName),
        c.recipientEmail ?? "",
        url,
      ].join(",");
    }),
  ];
  return { ok: true as const, csv: lines.join("\n"), count: certs.length };
}

export async function resendCertificateEmailAction(formData: FormData) {
  const user = await requireClubAdmin();
  const id = String(formData.get("certificateId") || "");
  const cert = await prisma.certificate.findFirst({
    where: { id, clubId: user.clubId! },
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
    where: { id: user.clubId! },
  });
  await resendCertificateEmail({
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
  return { ok: true as const };
}

export async function buildPdfZipManifestAction(eventId?: string) {
  const user = await requireClubAdmin();
  const certs = await prisma.certificate.findMany({
    where: {
      clubId: user.clubId!,
      status: CertificateStatus.issued,
      ...(eventId ? { eventId } : {}),
      OR: [{ pdfKey: { not: null } }, { pdfUrl: { not: null } }],
    },
    take: 500,
    select: {
      uniqueId: true,
      verificationToken: true,
      pdfKey: true,
      pdfUrl: true,
    },
  });

  const files: { name: string; url: string }[] = [];
  for (const c of certs) {
    let url: string | null = null;
    if (c.pdfKey) {
      url = await getShortLivedObjectUrl(c.pdfKey, 300);
    }
    if (!url) {
      url = buildPdfDownloadPath(c.uniqueId, c.verificationToken);
      const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
      url = `${base}${url}`;
    }
    files.push({ name: `${c.uniqueId}.pdf`, url });
  }
  return { ok: true as const, files, count: files.length };
}
