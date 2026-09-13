import { Inngest } from "inngest";
import {
  ImportJobStatus,
  ImportRowStatus,
} from "@/generated/prisma/client";
import { issueCertificate } from "@/lib/certificates/issue";
import { sendCertificateEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/db";

export const inngest = new Inngest({ id: "leoverify" });

export async function processImportJob(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      rows: { where: { status: ImportRowStatus.pending } },
      event: { include: { club: true } },
    },
  });
  if (!job) throw new Error("Import job not found");

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: ImportJobStatus.running },
  });

  let success = job.successRows;
  let failed = job.failedRows;
  let skipped = job.skippedRows;

  for (const row of job.rows) {
    try {
      const issued = await issueCertificate({
        eventId: job.eventId,
        clubId: job.clubId,
        actorUserId: job.createdById ?? "system",
        recipientName: row.recipientName,
        recipientEmail: row.recipientEmail,
        role: row.role,
        achievement: row.achievement,
      });

      if (issued.skipped) {
        skipped += 1;
        await prisma.importJobRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.skipped,
            certificateId: issued.id,
          },
        });
      } else {
        success += 1;
        await prisma.importJobRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.issued,
            certificateId: issued.id,
          },
        });

        if (row.recipientEmail) {
          await sendCertificateEmail({
            to: row.recipientEmail,
            recipientName: row.recipientName,
            uniqueId: issued.uniqueId,
            verificationToken: issued.verificationToken,
            eventName: job.event.name,
            clubName: job.event.club.name,
            pdfUrl: issued.pdfUrl,
          });
        }
      }
    } catch (error) {
      failed += 1;
      await prisma.importJobRow.update({
        where: { id: row.id },
        data: {
          status: ImportRowStatus.failed,
          error: error instanceof Error ? error.message : "Failed",
        },
      });
    }

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        successRows: success,
        failedRows: failed,
        skippedRows: skipped,
      },
    });
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: ImportJobStatus.completed,
      successRows: success,
      failedRows: failed,
      skippedRows: skipped,
    },
  });
}

export const processImportJobFn = inngest.createFunction(
  {
    id: "certificate-import-job",
    triggers: [{ event: "certificate/import.start" }],
  },
  async ({ event }) => {
    await processImportJob(String(event.data.jobId));
    return { ok: true };
  },
);

export const functions = [processImportJobFn];
