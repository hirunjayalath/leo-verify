import {
  ImportJobStatus,
  ImportRowStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { issueCertificate } from "@/lib/certificates/issue";
import { fetchBackgroundBytes } from "@/lib/certificates/safe-fetch";
import { buildPdfDownloadPath } from "@/lib/certificates/token";
import { sendCertificateEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/db";
import { captureException, logOps } from "@/lib/observability";
import { inngest } from "@/inngest/client";
import type { CertificateEmailPayload } from "@/inngest/jobs/types";

export const IMPORT_BATCH_SIZE = 20;
export const IMPORT_PDF_CONCURRENCY = 2;
export const IMPORT_MAX_BATCHES = 250;
export const EMAIL_EVENT_CHUNK = 25;

export function chunkItems<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  const step = Math.max(1, size);
  for (let i = 0; i < items.length; i += step) {
    out.push(items.slice(i, i + step));
  }
  return out;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

type RowOutcome =
  | { kind: "skipped"; certificateId: string; email?: CertificateEmailPayload }
  | { kind: "issued"; certificateId: string; email?: CertificateEmailPayload }
  | { kind: "failed"; error: string };

export type ImportBatchResult = {
  done: boolean;
  emails: CertificateEmailPayload[];
  processed: number;
};

export async function processImportBatch(
  jobId: string,
): Promise<ImportBatchResult> {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      rows: {
        where: { status: ImportRowStatus.pending },
        take: IMPORT_BATCH_SIZE,
        orderBy: { rowNumber: "asc" },
      },
      event: {
        include: {
          club: true,
          templates: {
            where: { status: TemplateStatus.approved },
            take: 1,
          },
        },
      },
    },
  });
  if (!job) throw new Error("Import job not found");

  if (job.rows.length === 0) {
    if (job.status !== ImportJobStatus.completed) {
      await prisma.importJob.update({
        where: { id: jobId },
        data: { status: ImportJobStatus.completed },
      });
    }
    return { done: true, emails: [], processed: 0 };
  }

  if (job.status !== ImportJobStatus.running) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.running },
    });
  }

  logOps("import.batch", {
    jobId,
    clubId: job.clubId,
    rows: job.rows.length,
  });

  let backgroundBytes: Uint8Array | undefined;
  const published = job.event.templates[0];
  if (published?.backgroundUrl) {
    try {
      backgroundBytes = await fetchBackgroundBytes(published.backgroundUrl);
    } catch (error) {
      captureException(error, { jobId, clubId: job.clubId, phase: "bg-fetch" });
    }
  }

  const outcomes = await mapPool(
    job.rows,
    IMPORT_PDF_CONCURRENCY,
    async (row) => {
      try {
        const issued = await issueCertificate({
          eventId: job.eventId,
          clubId: job.clubId,
          actorUserId: job.createdById ?? "system",
          recipientName: row.recipientName,
          recipientEmail: row.recipientEmail,
          role: row.role,
          achievement: row.achievement,
          sendEmail: false,
          backgroundBytes,
        });

        const email: CertificateEmailPayload | undefined =
          !issued.skipped && row.recipientEmail
            ? {
                to: row.recipientEmail,
                recipientName: row.recipientName,
                uniqueId: issued.uniqueId,
                verificationToken: issued.verificationToken,
                eventName: job.event.name,
                clubName: job.event.club.name,
                clubLogoUrl: job.event.club.logoUrl,
                primaryColor: job.event.club.primaryColor,
                accentColor: job.event.club.accentColor,
                jobId,
                clubId: job.clubId,
              }
            : undefined;

        if (issued.skipped) {
          await prisma.importJobRow.update({
            where: { id: row.id },
            data: {
              status: ImportRowStatus.skipped,
              certificateId: issued.id,
            },
          });
          return {
            kind: "skipped",
            certificateId: issued.id,
            email,
          } satisfies RowOutcome;
        }

        await prisma.importJobRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.issued,
            certificateId: issued.id,
          },
        });
        return {
          kind: "issued",
          certificateId: issued.id,
          email,
        } satisfies RowOutcome;
      } catch (error) {
        captureException(error, {
          jobId,
          clubId: job.clubId,
          rowId: row.id,
          phase: "issue",
        });
        const message = error instanceof Error ? error.message : "Failed";
        await prisma.importJobRow.update({
          where: { id: row.id },
          data: {
            status: ImportRowStatus.failed,
            error: message,
          },
        });
        return { kind: "failed", error: message } satisfies RowOutcome;
      }
    },
  );

  let success = job.successRows;
  let failed = job.failedRows;
  let skipped = job.skippedRows;
  const emails: CertificateEmailPayload[] = [];

  for (const outcome of outcomes) {
    if (outcome.kind === "issued") {
      success += 1;
      if (outcome.email) emails.push(outcome.email);
    } else if (outcome.kind === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  const remaining = await prisma.importJobRow.count({
    where: { jobId, status: ImportRowStatus.pending },
  });
  const done = remaining === 0;

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: done ? ImportJobStatus.completed : ImportJobStatus.running,
      successRows: success,
      failedRows: failed,
      skippedRows: skipped,
    },
  });

  if (done) {
    logOps("import.complete", {
      jobId,
      clubId: job.clubId,
      success,
      failed,
      skipped,
      emailsQueued: emails.length,
    });
  }

  return { done, emails, processed: outcomes.length };
}

async function dispatchImportEmails(emails: CertificateEmailPayload[]) {
  if (emails.length === 0) return;

  const hasInngest = Boolean(process.env.INNGEST_EVENT_KEY);
  if (hasInngest) {
    for (const chunk of chunkItems(emails, EMAIL_EVENT_CHUNK)) {
      await inngest.send(
        chunk.map((payload) => ({
          name: "certificate/email.send" as const,
          data: payload,
        })),
      );
    }
    return;
  }

  for (const payload of emails) {
    try {
      await sendCertificateEmail({
        to: payload.to,
        recipientName: payload.recipientName,
        uniqueId: payload.uniqueId,
        verificationToken: payload.verificationToken,
        eventName: payload.eventName,
        clubName: payload.clubName,
        pdfUrl: buildPdfDownloadPath(
          payload.uniqueId,
          payload.verificationToken,
        ),
        clubLogoUrl: payload.clubLogoUrl,
        primaryColor: payload.primaryColor,
        accentColor: payload.accentColor,
      });
    } catch (error) {
      captureException(error, {
        jobId: payload.jobId,
        clubId: payload.clubId,
        uniqueId: payload.uniqueId,
        phase: "email-sync",
      });
    }
  }
}

/** Sync / local path: drain pending rows in-process using the same batches. */
export async function processImportJob(jobId: string) {
  for (let i = 0; i < IMPORT_MAX_BATCHES; i++) {
    const result = await processImportBatch(jobId);
    await dispatchImportEmails(result.emails);
    if (result.done) return;
  }
}

export const processImportJobFn = inngest.createFunction(
  {
    id: "certificate-import-job",
    triggers: [{ event: "certificate/import.start" }],
    concurrency: { limit: 3 },
  },
  async ({ event, step }) => {
    const jobId = String(event.data.jobId);

    for (let i = 0; i < IMPORT_MAX_BATCHES; i++) {
      const result = await step.run(`import-batch-${i}`, () =>
        processImportBatch(jobId),
      );

      if (result.emails.length > 0) {
        const chunks = chunkItems(result.emails, EMAIL_EVENT_CHUNK);
        for (let c = 0; c < chunks.length; c++) {
          await step.sendEvent(
            `email-chunk-${i}-${c}`,
            chunks[c]!.map((payload) => ({
              name: "certificate/email.send" as const,
              data: payload,
            })),
          );
        }
      }

      if (result.done) {
        return { ok: true };
      }
    }

    await step.sendEvent("import-continue", {
      name: "certificate/import.start",
      data: { jobId },
    });
    return { ok: true, continued: true };
  },
);
