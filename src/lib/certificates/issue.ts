import { buildPdfDownloadPath } from "@/lib/certificates/token";
import { sendCertificateEmail } from "@/lib/email/resend";
import {
  attachCertificatePdf,
  auditCertificateIssue,
  commitReissue,
  createCertificateRecord,
  prepareReissue,
  revokeCertificateRecord,
  type IssueCertificateInput,
  type IssueCertificateResult,
} from "@/lib/certificates/issue-core";
import {
  deleteCertificatePdfObject,
  renderAndUploadCertificatePdf,
} from "@/lib/certificates/issue-pdf";

export type { IssueCertificateInput, IssueCertificateResult };

export async function issueCertificate(
  input: IssueCertificateInput,
): Promise<IssueCertificateResult> {
  const created = await createCertificateRecord(input);
  if (created.skipped) return created.result;

  const { certificate, uniqueId, verificationToken, issueDateIso, club, event, template } =
    created;

  const uploaded = await renderAndUploadCertificatePdf({
    clubId: input.clubId,
    template,
    backgroundBytes: input.backgroundBytes,
    recipientName: certificate.recipientName,
    role: certificate.role,
    issueDateIso,
    uniqueId: certificate.uniqueId,
    verificationToken,
    achievement: certificate.achievement,
    eventName: event.name,
    clubName: club.name,
  });

  const gatedPdfUrl = buildPdfDownloadPath(
    certificate.uniqueId,
    verificationToken,
  );
  await attachCertificatePdf({
    certificateId: certificate.id,
    pdfUrl: gatedPdfUrl,
    pdfKey: uploaded.key,
  });

  await auditCertificateIssue({
    actorUserId: input.actorUserId,
    certificateId: certificate.id,
    clubId: input.clubId,
    uniqueId,
    recipientName: certificate.recipientName,
    eventId: input.eventId,
  });

  let emailSent = false;
  if (input.sendEmail !== false && certificate.recipientEmail) {
    const emailResult = await sendCertificateEmail({
      to: certificate.recipientEmail,
      recipientName: certificate.recipientName,
      uniqueId: certificate.uniqueId,
      verificationToken,
      eventName: event.name,
      clubName: club.name,
      pdfUrl: buildPdfDownloadPath(
        certificate.uniqueId,
        verificationToken,
      ),
      clubLogoUrl: club.logoUrl,
      primaryColor: club.primaryColor,
      accentColor: club.accentColor,
    });
    emailSent = emailResult.sent;
  }

  return {
    id: certificate.id,
    uniqueId,
    verificationToken,
    pdfUrl: gatedPdfUrl,
    emailSent,
  };
}

export async function revokeCertificate(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
  reason: string;
}) {
  const result = await revokeCertificateRecord(input);
  if (result.alreadyRevoked) return result.cert;

  await deleteCertificatePdfObject(result.previousPdfKey);
  return result.updated;
}

/** New token + PDF; status stays issued. Does not revoke. */
export async function reissueCertificate(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
}): Promise<IssueCertificateResult> {
  const prepared = await prepareReissue(input);
  const { cert, template, issueDateIso, tokenVersion, verificationToken, club } =
    prepared;

  const uploaded = await renderAndUploadCertificatePdf({
    clubId: input.clubId,
    template,
    recipientName: cert.recipientName,
    role: cert.role,
    issueDateIso,
    uniqueId: cert.uniqueId,
    verificationToken,
    achievement: cert.achievement,
    eventName: cert.event.name,
    clubName: club.name,
  });

  const gatedPdfUrl = buildPdfDownloadPath(cert.uniqueId, verificationToken);
  const updated = await commitReissue({
    certificateId: cert.id,
    clubId: input.clubId,
    actorUserId: input.actorUserId,
    verificationToken,
    tokenVersion,
    uniqueId: cert.uniqueId,
    pdfUrl: gatedPdfUrl,
    pdfKey: uploaded.key,
  });

  if (!updated) {
    await deleteCertificatePdfObject(uploaded.key);
    throw new Error("Only issued certificates can be reissued");
  }

  if (cert.pdfKey && cert.pdfKey !== uploaded.key) {
    await deleteCertificatePdfObject(cert.pdfKey);
  }

  return {
    id: updated.id,
    uniqueId: updated.uniqueId,
    verificationToken,
    pdfUrl: gatedPdfUrl,
  };
}
