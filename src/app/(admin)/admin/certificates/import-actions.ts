"use server";

import { revalidatePath } from "next/cache";
import {
  ImportJobStatus,
  ImportRowStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireClubAdmin } from "@/lib/auth";
import { validateCertificateCsv } from "@/lib/certificates/csv";
import { prisma } from "@/lib/db";
import { inngest, processImportJob } from "@/inngest/functions";

export type ImportActionResult =
  | {
      ok: true;
      jobId: string;
      mode: "async" | "sync";
      successRows?: number;
      skippedRows?: number;
      failedRows?: number;
      totalRows?: number;
    }
  | {
      ok: false;
      error: string;
      rowErrors?: { rowNumber: number; message: string }[];
    };

export async function startCsvImportAction(
  formData: FormData,
): Promise<ImportActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const eventId = String(formData.get("eventId") || "");
  const file = formData.get("csv");

  if (!eventId) return { ok: false, error: "Event is required" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "CSV file is required" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "CSV must be 2 MB or smaller" };
  }

  const event = await prisma.event.findFirst({ where: { id: eventId, clubId } });
  if (!event) return { ok: false, error: "Event not found" };

  const approved = await prisma.certificateTemplate.findFirst({
    where: { eventId, clubId, status: TemplateStatus.approved },
    select: { id: true },
  });
  if (!approved) {
    return {
      ok: false,
      error:
        "This event has no approved template. Create and approve a template before importing.",
    };
  }

  const text = await file.text();
  const validated = validateCertificateCsv(text);
  if (!validated.ok) {
    return {
      ok: false,
      error: "CSV validation failed — fix rows before importing",
      rowErrors: validated.errors,
    };
  }

  const job = await prisma.importJob.create({
    data: {
      clubId,
      eventId,
      createdById: user.id,
      status: ImportJobStatus.pending,
      totalRows: validated.rows.length,
      rows: {
        create: validated.rows.map((row) => ({
          rowNumber: row.rowNumber,
          recipientName: row.recipientName,
          recipientEmail: row.recipientEmail ?? null,
          role: row.role,
          achievement: row.achievement ?? null,
          status: ImportRowStatus.pending,
        })),
      },
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "import.start",
    targetType: "ImportJob",
    targetId: job.id,
    clubId,
    metadata: { eventId, totalRows: validated.rows.length },
  });

  const hasInngest = Boolean(process.env.INNGEST_EVENT_KEY);
  if (hasInngest) {
    await inngest.send({
      name: "certificate/import.start",
      data: { jobId: job.id },
    });
    revalidatePath("/admin/certificates");
    return {
      ok: true,
      jobId: job.id,
      mode: "async",
      totalRows: validated.rows.length,
    };
  }

  // Local/dev fallback: process synchronously when Inngest is not configured
  await processImportJob(job.id);
  const finished = await prisma.importJob.findUniqueOrThrow({
    where: { id: job.id },
  });
  revalidatePath("/admin/certificates");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  return {
    ok: true,
    jobId: job.id,
    mode: "sync",
    successRows: finished.successRows,
    skippedRows: finished.skippedRows,
    failedRows: finished.failedRows,
    totalRows: finished.totalRows,
  };
}
