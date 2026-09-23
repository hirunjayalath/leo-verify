import {
  ImportJobStatus,
  ImportRowStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { issueCertificate } from "@/lib/certificates/issue";
import { fetchBackgroundBytes } from "@/lib/certificates/safe-fetch";
import { buildPdfDownloadPath } from "@/lib/certificates/token";
import { requireEmailSent, sendCertificateEmail } from "@/lib/email/resend";
import { prismaService, withRlsContext } from "@/lib/db";
import { captureException, logOps } from "@/lib/observability";
import { inngest } from "@/inngest/client";
import type { CertificateEmailPayload } from "@/inngest/jobs/types";

export const IMPORT_BATCH_SIZE = 20;
export const IMPORT_PDF_CONCURRENCY = 1;
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

export function countersFromRowGroups(
  groups: { status: ImportRowStatus; _count: { _all: number } }[],
): { successRows: number; failedRows: number; skippedRows: number } {
  let successRows = 0;
  let failedRows = 0;
  let skippedRows = 0;
  for (const group of groups) {
    if (group.status === ImportRowStatus.issued) successRows = group._count._all;
    else if (group.status === ImportRowStatus.failed)
      failedRows = group._count._all;
    else if (group.status === ImportRowStatus.skipped)
      skippedRows = group._count._all;
  }
  return { successRows, failedRows, skippedRows };
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

export type ImportBatchResult = {
  done: boolean;
  emails: CertificateEmailPayload[];
  processed: number;
};

async function actorSupabaseIdForJob(jobId: string): Promise<string> {
  const rows = await prismaService.$queryRaw<Array<{ supabase_id: string | null }>>`
    SELECT public.import_job_actor_supabase_id(${jobId}) AS supabase_id
  `;
  const supabaseId = rows[0]?.supabase_id;
  if (!supabaseId) {
    throw new Error("Import job is missing an actor");
  }
  return supabaseId;
}

type LoadedImportBatch = {
  clubId: string;
  eventId: string;
  createdById: string | null;
  eventName: string;
  clubName: string;
  clubLogoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  backgroundUrl: string | null;
  rows: {
    id: string;
    recipientName: string;
    recipientEmail: string | null;
    role: string;
    achievement: string | null;
  }[];
};

export async function processImportBatch(
  jobId: string,
): Promise<ImportBatchResult> {
  const supabaseId = await actorSupabaseIdForJob(jobId);

  const loaded = await withRlsContext(
    supabaseId,
    async (tx): Promise<LoadedImportBatch | { empty: true }> => {
      const job = await tx.importJob.findUnique({
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
          await tx.importJob.update({
            where: { id: jobId },
            data: { status: ImportJobStatus.completed },
          });
        }
        return { empty: true };
      }

      if (job.status !== ImportJobStatus.running) {
        await tx.importJob.update({
          where: { id: jobId },
          data: { status: ImportJobStatus.running },
        });
      }

      return {
        clubId: job.clubId,
        eventId: job.eventId,
        createdById: job.createdById,
        eventName: job.event.name,
        clubName: job.event.club.name,
        clubLogoUrl: job.event.club.logoUrl,
        primaryColor: job.event.club.primaryColor,
        accentColor: job.event.club.accentColor,
        backgroundUrl: job.event.templates[0]?.backgroundUrl ?? null,
        rows: job.rows.map((row) => ({
          id: row.id,
          recipientName: row.recipientName,
          recipientEmail: row.recipientEmail,
          role: row.role,
          achievement: row.achievement,
        })),
      };
    },
  );

  if ("empty" in loaded) {
    return { done: true, emails: [], processed: 0 };
  }

  logOps("import.batch", {
    jobId,
    clubId: loaded.clubId,
    rows: loaded.rows.length,
  });

  let backgroundBytes: Uint8Array | undefined;
  if (loaded.backgroundUrl) {
    try {
      backgroundBytes = await fetchBackgroundBytes(loaded.backgroundUrl);
    } catch (error) {
      logOps("import.background_fetch_failed", {
        jobId,
        clubId: loaded.clubId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const outcomes = await mapPool(
    loaded.rows,
    IMPORT_PDF_CONCURRENCY,
    async (row) => {
      try {
        const issued = await issueCertificate({
          eventId: loaded.eventId,
          clubId: loaded.clubId,
          actorUserId: loaded.createdById ?? "system",
          actorSupabaseId: supabaseId,
          recipientName: row.recipientName,
          recipientEmail: row.recipientEmail,
          role: row.role,
          achievement: row.achievement,
          sendEmail: false,
          backgroundBytes,
          onRecordCreated: async (tx, outcome) => {
            await tx.importJobRow.update({
              where: { id: row.id },
              data: {
                status:
                  outcome.kind === "skipped"
                    ? ImportRowStatus.skipped
                    : ImportRowStatus.issued,
                certificateId: outcome.certificateId,
              },
            });
          },
        });

        const email: CertificateEmailPayload | undefined =
          !issued.skipped && !issued.pdfAttachFailed && row.recipientEmail
            ? {
                to: row.recipientEmail,
                recipientName: row.recipientName,
                uniqueId: issued.uniqueId,
                verificationToken: issued.verificationToken,
                eventName: loaded.eventName,
                clubName: loaded.clubName,
                clubLogoUrl: loaded.clubLogoUrl,
                primaryColor: loaded.primaryColor,
                accentColor: loaded.accentColor,
                jobId,
                clubId: loaded.clubId,
              }
            : undefined;

        return {
          rowId: row.id,
          kind: issued.skipped ? ("skipped" as const) : ("issued" as const),
          certificateId: issued.id,
          email,
        };
      } catch (error) {
        captureException(error, {
          jobId,
          clubId: loaded.clubId,
          rowId: row.id,
          phase: "issue",
        });
        return {
          rowId: row.id,
          kind: "failed" as const,
          error: error instanceof Error ? error.message : "Failed",
        };
      }
    },
  );

  const emails: CertificateEmailPayload[] = [];
  for (const outcome of outcomes) {
    if (outcome.kind === "issued" && outcome.email) emails.push(outcome.email);
  }

  const done = await withRlsContext(supabaseId, async (tx) => {
    for (const outcome of outcomes) {
      if (outcome.kind === "failed") {
        await tx.importJobRow.update({
          where: { id: outcome.rowId },
          data: {
            status: ImportRowStatus.failed,
            error: outcome.error,
          },
        });
      }
    }

    const remaining = await tx.importJobRow.count({
      where: { jobId, status: ImportRowStatus.pending },
    });
    const groups = await tx.importJobRow.groupBy({
      by: ["status"],
      where: { jobId },
      _count: { _all: true },
    });
    const finished = remaining === 0;
    const counters = countersFromRowGroups(groups);

    await tx.importJob.update({
      where: { id: jobId },
      data: {
        status: finished ? ImportJobStatus.completed : ImportJobStatus.running,
        ...counters,
      },
    });

    if (finished) {
      logOps("import.complete", {
        jobId,
        clubId: loaded.clubId,
        ...counters,
        emailsQueued: emails.length,
      });
    }

    return finished;
  });

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
      const result = await sendCertificateEmail({
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
      requireEmailSent(result);
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
    concurrency: { limit: 1, key: "event.data.jobId" },
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
