import { requireEmailSent, sendCertificateEmail } from "@/lib/email/resend";
import { captureException, logOps } from "@/lib/observability";
import { inngest } from "@/inngest/client";
import type { CertificateEmailPayload } from "@/inngest/jobs/types";

export const sendCertificateEmailFn = inngest.createFunction(
  {
    id: "certificate-email-send",
    triggers: [{ event: "certificate/email.send" }],
    concurrency: { limit: 2 },
    retries: 4,
  },
  async ({ event }) => {
    const data = event.data as CertificateEmailPayload;
    try {
      const result = await sendCertificateEmail({
        to: data.to,
        recipientName: data.recipientName,
        uniqueId: data.uniqueId,
        verificationToken: data.verificationToken,
        eventName: data.eventName,
        clubName: data.clubName,
        pdfUrl: "/claim",
        clubLogoUrl: data.clubLogoUrl,
        primaryColor: data.primaryColor,
        accentColor: data.accentColor,
      });
      requireEmailSent(result);
      if (result.sent) {
        logOps("email.sent", {
          jobId: data.jobId,
          clubId: data.clubId,
          uniqueId: data.uniqueId,
        });
      }
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
