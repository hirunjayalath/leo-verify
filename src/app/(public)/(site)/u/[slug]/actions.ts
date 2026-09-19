"use server";

import { redirect } from "next/navigation";
import { CertificateStatus } from "@/generated/prisma/client";
import { buildVerificationPath } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";

/** Tokenized verify redirect for public-profile listings — keeps HMAC out of crawlable HTML. */
export async function openPublicVerifyAction(formData: FormData) {
  const uniqueId = String(formData.get("uniqueId") || "").trim();
  if (!uniqueId) {
    redirect("/");
  }

  const cert = await prisma.certificate.findUnique({
    where: { uniqueId },
    include: {
      recipient: { select: { publicProfile: true } },
    },
  });

  if (
    !cert ||
    cert.status !== CertificateStatus.issued ||
    cert.unlisted ||
    !cert.recipient?.publicProfile
  ) {
    redirect(`/v/${encodeURIComponent(uniqueId)}`);
  }

  redirect(buildVerificationPath(cert.uniqueId, cert.verificationToken));
}
