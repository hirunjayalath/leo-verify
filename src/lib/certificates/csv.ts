import { parse } from "csv-parse/sync";
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

function normalizeHeader(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_]+/g, "");
}

const HEADER_MAP: Record<string, keyof z.infer<typeof rowSchema>> = {
  name: "recipientName",
  recipientname: "recipientName",
  recipient: "recipientName",
  email: "recipientEmail",
  recipientemail: "recipientEmail",
  role: "role",
  achievement: "achievement",
};

export function validateCertificateCsv(csvText: string): CsvValidationResult {
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          rowNumber: 0,
          message:
            error instanceof Error ? error.message : "Failed to parse CSV",
        },
      ],
    };
  }

  if (records.length === 0) {
    return { ok: false, errors: [{ rowNumber: 0, message: "CSV has no data rows" }] };
  }

  const errors: { rowNumber: number; message: string }[] = [];
  const rows: CsvRecipientRow[] = [];

  records.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const field = HEADER_MAP[normalizeHeader(key)];
      if (field) mapped[field] = value;
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
