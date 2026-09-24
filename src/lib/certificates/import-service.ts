import {
  ImportJobStatus,
  ImportRowStatus,
  TemplateStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  type ColumnMapping,
  type RosterField,
  validateCertificateCsv,
  validateCertificateXlsx,
} from "@/lib/certificates/csv";
import { assertNotInRlsContext, withRlsContext } from "@/lib/db";
import { type ActionResult } from "@/lib/action-result";
import { inngest, processImportJob } from "@/inngest/functions";

export type ImportServiceResult =
  | ActionResult<{
      jobId: string;
      mode: "async" | "sync";
      successRows?: number;
      skippedRows?: number;
      failedRows?: number;
      totalRows?: number;
    }>
  | { ok: false; error: string; rowErrors: { rowNumber: number; message: string }[] };

const ROSTER_FIELD_KEYS = new Set<RosterField>([
  "recipientName",
  "recipientEmail",
  "role",
  "achievement",
]);

export function parseColumnMapping(
  raw: FormDataEntryValue | null,
): ColumnMapping | undefined {
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

export function isSpreadsheetFile(file: File): boolean {
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

export async function startCertificateImport(input: {
  clubId: string;
  actorUserId: string;
  actorSupabaseId: string;
  eventId: string;
  templateId?: string;
  file: File;
  mapping?: ColumnMapping;
}): Promise<ImportServiceResult> {
  assertNotInRlsContext("startCertificateImport");

  if (!input.eventId) return { ok: false, error: "Event is required" };
  if (!input.templateId) return { ok: false, error: "Template is required" };
  if (!(input.file instanceof File) || input.file.size === 0) {
    return { ok: false, error: "Spreadsheet file is required" };
  }
  if (input.file.size > 2 * 1024 * 1024) {
    return { ok: false, error: "File must be 2 MB or smaller" };
  }
  if (!isSpreadsheetFile(input.file)) {
    return { ok: false, error: "Upload a .csv or .xlsx file" };
  }

  const name = input.file.name.toLowerCase();
  const validated =
    name.endsWith(".xlsx") || name.endsWith(".xls")
      ? validateCertificateXlsx(
          Buffer.from(await input.file.arrayBuffer()),
          input.mapping,
        )
      : validateCertificateCsv(await input.file.text(), input.mapping);

  if (!validated.ok) {
    return {
      ok: false,
      error: "Validation failed. Fix the rows before importing.",
      rowErrors: validated.errors,
    };
  }

  const created = await withRlsContext(input.actorSupabaseId, async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: input.eventId, clubId: input.clubId },
    });
    if (!event) return { ok: false as const, error: "Event not found" };

    const approved = await tx.certificateTemplate.findFirst({
      where: {
        id: input.templateId,
        eventId: input.eventId,
        clubId: input.clubId,
        status: TemplateStatus.approved,
      },
      select: { id: true },
    });
    if (!approved) {
      return {
        ok: false as const,
        error:
          "Pick an approved template for this event before importing.",
      };
    }

    const job = await tx.importJob.create({
      data: {
        clubId: input.clubId,
        eventId: input.eventId,
        templateId: approved.id,
        createdById: input.actorUserId,
        status: ImportJobStatus.pending,
        totalRows: validated.rows.length,
        rows: {
          create: validated.rows.map((row) => ({
            clubId: input.clubId,
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
      actorUserId: input.actorUserId,
      action: "import.start",
      targetType: "ImportJob",
      targetId: job.id,
      clubId: input.clubId,
      metadata: {
        eventId: input.eventId,
        totalRows: validated.rows.length,
        name: event.name,
      },
      client: tx,
    });

    return { ok: true as const, jobId: job.id };
  });

  if (!created.ok) return created;

  const hasInngest = Boolean(process.env.INNGEST_EVENT_KEY);
  if (hasInngest) {
    await inngest.send({
      name: "certificate/import.start",
      data: { jobId: created.jobId },
    });
    return {
      ok: true,
      jobId: created.jobId,
      mode: "async",
      totalRows: validated.rows.length,
    };
  }

  await processImportJob(created.jobId);
  const finished = await withRlsContext(input.actorSupabaseId, (tx) =>
    tx.importJob.findUniqueOrThrow({
      where: { id: created.jobId },
    }),
  );
  return {
    ok: true,
    jobId: created.jobId,
    mode: "sync",
    successRows: finished.successRows,
    skippedRows: finished.skippedRows,
    failedRows: finished.failedRows,
    totalRows: finished.totalRows,
  };
}
