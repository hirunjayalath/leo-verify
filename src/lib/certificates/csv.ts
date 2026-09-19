import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { z } from "zod";

const rowSchema = z.object({
  recipientName: z.string().trim().min(2),
  recipientEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  role: z.string().trim().min(1),
  achievement: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type RosterField =
  | "recipientName"
  | "recipientEmail"
  | "role"
  | "achievement";

export type CsvRecipientRow = {
  rowNumber: number;
  recipientName: string;
  recipientEmail?: string;
  role: string;
  achievement?: string;
};

export type CsvValidationResult =
  | { ok: true; rows: CsvRecipientRow[] }
  | { ok: false; errors: { rowNumber: number; message: string }[] };

export type ColumnMapping = Partial<Record<RosterField, string>>;

export const ROSTER_FIELDS: {
  key: RosterField;
  label: string;
  required: boolean;
}[] = [
  { key: "recipientName", label: "Name", required: true },
  { key: "recipientEmail", label: "Email", required: false },
  { key: "role", label: "Role", required: true },
  { key: "achievement", label: "Achievement", required: false },
];

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_]+/g, "");
}

export const HEADER_MAP: Record<string, RosterField> = {
  name: "recipientName",
  recipientname: "recipientName",
  recipient: "recipientName",
  email: "recipientEmail",
  recipientemail: "recipientEmail",
  role: "role",
  achievement: "achievement",
};

export function autoMapHeaders(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const field = HEADER_MAP[normalizeHeader(header)];
    if (field && !mapping[field]) mapping[field] = header;
  }
  return mapping;
}

export function mappingIsComplete(mapping: ColumnMapping): boolean {
  return Boolean(mapping.recipientName && mapping.role);
}

export type ParsedSpreadsheet = {
  headers: string[];
  records: Record<string, string>[];
};

export function parseCsvText(csvText: string): ParsedSpreadsheet | { error: string } {
  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
    if (records.length === 0) {
      return { error: "File has no data rows" };
    }
    const headers = Object.keys(records[0] ?? {});
    return { headers, records };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to parse CSV",
    };
  }
}

export function parseXlsxBuffer(buffer: ArrayBuffer | Buffer): ParsedSpreadsheet | { error: string } {
  try {
    const data =
      buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { error: "Workbook has no sheets" };
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    }).map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        out[String(k)] = v == null ? "" : String(v).trim();
      }
      return out;
    });
    if (records.length === 0) return { error: "Sheet has no data rows" };
    const headers = Object.keys(records[0] ?? {});
    return { headers, records };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to parse Excel file",
    };
  }
}

export function validateRosterRows(
  records: Record<string, string>[],
  mapping?: ColumnMapping,
): CsvValidationResult {
  if (records.length === 0) {
    return { ok: false, errors: [{ rowNumber: 0, message: "File has no data rows" }] };
  }

  if (records.length > 500) {
    return {
      ok: false,
      errors: [
        {
          rowNumber: 0,
          message: "Import exceeds the maximum of 500 rows per import",
        },
      ],
    };
  }

  const headers = Object.keys(records[0] ?? {});
  const resolved: ColumnMapping =
    mapping && Object.keys(mapping).length > 0
      ? mapping
      : autoMapHeaders(headers);

  if (!mappingIsComplete(resolved)) {
    return {
      ok: false,
      errors: [
        {
          rowNumber: 0,
          message:
            "Could not map required columns (name and role). Map columns manually and try again.",
        },
      ],
    };
  }

  const errors: { rowNumber: number; message: string }[] = [];
  const rows: CsvRecipientRow[] = [];

  records.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1
    const mapped: Record<string, string> = {};
    for (const field of ROSTER_FIELDS) {
      const header = resolved[field.key];
      if (header) mapped[field.key] = raw[header] ?? "";
    }
    const parsed = rowSchema.safeParse(mapped);
    if (!parsed.success) {
      errors.push({
        rowNumber,
        message: parsed.error.issues.map((i) => i.message).join("; "),
      });
      return;
    }
    rows.push({
      rowNumber,
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail,
      role: parsed.data.role,
      achievement: parsed.data.achievement,
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, rows };
}

export function validateCertificateCsv(
  csvText: string,
  mapping?: ColumnMapping,
): CsvValidationResult {
  const parsed = parseCsvText(csvText);
  if ("error" in parsed) {
    return {
      ok: false,
      errors: [{ rowNumber: 0, message: parsed.error }],
    };
  }
  return validateRosterRows(parsed.records, mapping);
}

export function validateCertificateXlsx(
  buffer: ArrayBuffer | Buffer,
  mapping?: ColumnMapping,
): CsvValidationResult {
  const parsed = parseXlsxBuffer(buffer);
  if ("error" in parsed) {
    return {
      ok: false,
      errors: [{ rowNumber: 0, message: parsed.error }],
    };
  }
  return validateRosterRows(parsed.records, mapping);
}
