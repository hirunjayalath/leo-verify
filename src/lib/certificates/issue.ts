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
import { assertNotInRlsContext, withRlsContext } from "@/lib/db";
import { logOps } from "@/lib/observability";

export type { IssueCertificateInput, IssueCertificateResult };

export async function issueCertificate(
  input: IssueCertificateInput,
): Promise<IssueCertificateResult> {
  assertNotInRlsContext("issueCertificate");

  const created = await withRlsContext(input.actorSupabaseId, async (tx) => {
    const record = await createCertificateRecord(input, tx);
    if (record.skipped) return record;
    await auditCertificateIssue(
      {
        actorUserId: input.actorUserId,
        certificateId: record.certificate.id,
        clubId: input.clubId,
        uniqueId: record.uniqueId,
        recipientName: record.certificate.recipientName,
        eventId: input.eventId,
      },
      tx,
    );
    return record;
  });

  if (created.skipped) return created.result;

  const { certificate, uniqueId, verificationToken, issueDateIso, club, event, template } =
    created;

  const gatedPdfUrl = buildPdfDownloadPath(
    certificate.uniqueId,
    verificationToken,
  );

  let pdfUrl: string | null = null;
  try {
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
    await withRlsContext(input.actorSupabaseId, (tx) =>
      attachCertificatePdf(
        {
          certificateId: certificate.id,
          pdfUrl: gatedPdfUrl,
          pdfKey: uploaded.key,
        },
        tx,
      ),
    );
    pdfUrl = gatedPdfUrl;
  } catch (error) {
    logOps("certificate.pdf_attach_failed", {
      certificateId: certificate.id,
      uniqueId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  let emailSent = false;
  if (input.sendEmail !== false && certificate.recipientEmail) {
    const emailResult = await sendCertificateEmail({
      to: certificate.recipientEmail,
      recipientName: certificate.recipientName,
      uniqueId: certificate.uniqueId,
      verificationToken,
      eventName: event.name,
      clubName: club.name,
      pdfUrl: gatedPdfUrl,
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
    pdfUrl,
    emailSent,
  };
}

export async function revokeCertificate(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
  actorSupabaseId: string;
  reason: string;
}) {
  assertNotInRlsContext("revokeCertificate");
  const result = await withRlsContext(input.actorSupabaseId, (tx) =>
    revokeCertificateRecord(input, tx),
  );
  if (result.alreadyRevoked) return result.cert;

  await deleteCertificatePdfObject(result.previousPdfKey);
  return result.updated;
}

/** New token + PDF; status stays issued. Does not revoke. */
export async function reissueCertificate(input: {
  certificateId: string;
  clubId: string;
  actorUserId: string;
  actorSupabaseId: string;
}): Promise<IssueCertificateResult> {
  assertNotInRlsContext("reissueCertificate");
  const prepared = await withRlsContext(input.actorSupabaseId, (tx) =>
    prepareReissue(input, tx),
  );
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
  const updated = await withRlsContext(input.actorSupabaseId, (tx) =>
    commitReissue(
      {
        certificateId: cert.id,
        clubId: input.clubId,
        actorUserId: input.actorUserId,
        verificationToken,
        tokenVersion,
        uniqueId: cert.uniqueId,
        pdfUrl: gatedPdfUrl,
        pdfKey: uploaded.key,
      },
      tx,
    ),
  );

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
