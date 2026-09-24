"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail } from "@/lib/action-result";
import { requireClubAdmin } from "@/lib/auth";
import {
  type ImportServiceResult,
  parseColumnMapping,
  startCertificateImport,
} from "@/lib/certificates/import-service";
import { captureException } from "@/lib/observability";

const importSchema = z.object({
  eventId: z.string().min(1),
  templateId: z.string().min(1),
});

export async function startCsvImportAction(
  formData: FormData,
): Promise<ImportServiceResult> {
  const user = await requireClubAdmin();
  const parsed = importSchema.safeParse({
    eventId: formData.get("eventId"),
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) {
    return fail("Event and template are required");
  }
  const file = formData.get("csv");
  const mapping = parseColumnMapping(formData.get("columnMapping"));

  if (!(file instanceof File)) {
    return fail("Spreadsheet file is required");
  }

  try {
    const result = await startCertificateImport({
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      eventId: parsed.data.eventId,
      templateId: parsed.data.templateId,
      file,
      mapping,
    });

    if (result.ok) {
      revalidatePath("/admin/certificates");
      if (result.mode === "sync") {
        revalidatePath("/admin");
        revalidatePath("/admin/audit");
      }
    }

    return result;
  } catch (error) {
    await captureException(error, { phase: "import.start" });
    return fail("Could not start import");
  }
}
