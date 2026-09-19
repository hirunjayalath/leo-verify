"use server";

import { revalidatePath } from "next/cache";
import {
  ImportJobStatus,
  ImportRowStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { requireClubAdmin } from "@/lib/auth";
import {
  type ColumnMapping,
  type RosterField,
  validateCertificateCsv,
  validateCertificateXlsx,
} from "@/lib/certificates/csv";
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

const ROSTER_FIELD_KEYS = new Set<RosterField>([
  "recipientName",
  "recipientEmail",
  "role",
  "achievement",
]);

function parseColumnMapping(raw: FormDataEntryValue | null): ColumnMapping | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mapping: ColumnMapping = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (
        ROSTER_FIELD_KEYS.has(key as RosterField) &&
        typeof value === "string" &&
        value.trim()
      ) {
        mapping[key as RosterField] = value;
      }
    }
    return Object.keys(mapping).length > 0 ? mapping : undefined;
  } catch {
    return undefined;
  }
}

function isSpreadsheetFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    file.type === "text/csv" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

export async function startCsvImportAction(
  formData: FormData,
): Promise<ImportActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const eventId = String(formData.get("eventId") || "");
  const file = formData.get("csv");
  const mapping = parseColumnMapping(formData.get("columnMapping"));

  if (!eventId) return { ok: false, error: "Event is required" };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Spreadsheet file is required" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "File must be 2 MB or smaller" };
  }
  if (!isSpreadsheetFile(file)) {
    return { ok: false, error: "Upload a .csv or .xlsx file" };
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

  const name = file.name.toLowerCase();
  const validated =
    name.endsWith(".xlsx") || name.endsWith(".xls")
      ? validateCertificateXlsx(Buffer.from(await file.arrayBuffer()), mapping)
      : validateCertificateCsv(await file.text(), mapping);

  if (!validated.ok) {
    return {
      ok: false,
      error: "Validation failed — fix rows before importing",
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
