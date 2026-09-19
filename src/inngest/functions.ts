import { Inngest } from "inngest";
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

export const inngest = new Inngest({ id: "leoverify" });

const IMPORT_CONCURRENCY = Math.min(
  10,
  Math.max(1, Number(process.env.IMPORT_ROW_CONCURRENCY || 5) || 5),
);

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

type EmailPayload = {
  to: string;
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  clubLogoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  jobId?: string;
  clubId?: string;
};

type RowOutcome =
  | { kind: "skipped"; certificateId: string; email?: EmailPayload }
  | { kind: "issued"; certificateId: string; email?: EmailPayload }
  | { kind: "failed"; error: string };

export async function processImportJob(jobId: string) {
  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      rows: { where: { status: ImportRowStatus.pending } },
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

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: ImportJobStatus.running },
  });

  logOps("import.start", { jobId, clubId: job.clubId, rows: job.rows.length });

  let backgroundBytes: Uint8Array | undefined;
  const published = job.event.templates[0];
  if (published?.backgroundUrl) {
    try {
      backgroundBytes = await fetchBackgroundBytes(published.backgroundUrl);
    } catch (error) {
      captureException(error, { jobId, clubId: job.clubId, phase: "bg-fetch" });
    }
  }

  const outcomes = await mapPool(job.rows, IMPORT_CONCURRENCY, async (row) => {
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

      const email: EmailPayload | undefined =
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
  });

  let success = job.successRows;
  let failed = job.failedRows;
  let skipped = job.skippedRows;
  const emailQueue: EmailPayload[] = [];

  for (const outcome of outcomes) {
    if (outcome.kind === "issued") {
      success += 1;
      if (outcome.email) emailQueue.push(outcome.email);
    } else if (outcome.kind === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
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

  if (emailQueue.length > 0) {
    const hasInngest = Boolean(process.env.INNGEST_EVENT_KEY);
    if (hasInngest) {
      await inngest.send(
        emailQueue.map((payload) => ({
          name: "certificate/email.send" as const,
          data: payload,
        })),
      );
    } else {
      // Local/sync path: send immediately when Inngest is not configured.
      for (const payload of emailQueue) {
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
  }

  logOps("import.complete", {
    jobId,
    clubId: job.clubId,
    success,
    failed,
    skipped,
    emailsQueued: emailQueue.length,
  });
}

export const processImportJobFn = inngest.createFunction(
  {
    id: "certificate-import-job",
    triggers: [{ event: "certificate/import.start" }],
    concurrency: { limit: 3 },
  },
  async ({ event }) => {
    await processImportJob(String(event.data.jobId));
    return { ok: true };
  },
);

export const sendCertificateEmailFn = inngest.createFunction(
  {
    id: "certificate-email-send",
    triggers: [{ event: "certificate/email.send" }],
    concurrency: { limit: 10 },
    retries: 4,
  },
  async ({ event }) => {
    const data = event.data as EmailPayload;
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

export const functions = [processImportJobFn, sendCertificateEmailFn];
