import { buildPdfDownloadPath } from "@/lib/certificates/token";
import { sendCertificateEmail } from "@/lib/email/resend";
import { captureException, logOps } from "@/lib/observability";
import { inngest } from "@/inngest/client";
import type { CertificateEmailPayload } from "@/inngest/jobs/types";

export const sendCertificateEmailFn = inngest.createFunction(
  {
    id: "certificate-email-send",
    triggers: [{ event: "certificate/email.send" }],
    concurrency: { limit: 10 },
    retries: 4,
  },
  async ({ event }) => {
    const data = event.data as CertificateEmailPayload;
    try {
      await sendCertificateEmail({
        to: data.to,
        recipientName: data.recipientName,
        uniqueId: data.uniqueId,
        verificationToken: data.verificationToken,
        eventName: data.eventName,
        clubName: data.clubName,
        pdfUrl: buildPdfDownloadPath(data.uniqueId, data.verificationToken),
        clubLogoUrl: data.clubLogoUrl,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
      });
      logOps("email.sent", {
        jobId: data.jobId,
        clubId: data.clubId,
        uniqueId: data.uniqueId,
      });
      return { ok: true };
    } catch (error) {
      captureException(error, {
        jobId: data.jobId,
        clubId: data.clubId,
        uniqueId: data.uniqueId,
        phase: "email",
      });
      throw error;
    }
  },
);
