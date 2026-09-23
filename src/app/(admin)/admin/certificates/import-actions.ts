"use server";

import { revalidatePath } from "next/cache";
import { asClubAdmin } from "@/lib/auth";
import {
  type ImportServiceResult,
  parseColumnMapping,
  startCertificateImport,
} from "@/lib/certificates/import-service";

export type ImportActionResult = ImportServiceResult;

export async function startCsvImportAction(
  formData: FormData,
): Promise<ImportActionResult> {
  return asClubAdmin(async (user) => {
  const clubId = user.clubId!;
  const eventId = String(formData.get("eventId") || "");
  const file = formData.get("csv");
  const mapping = parseColumnMapping(formData.get("columnMapping"));

  if (!(file instanceof File)) {
    return { ok: false, error: "Spreadsheet file is required" };
  }

  const result = await startCertificateImport({
    clubId,
    actorUserId: user.id,
    eventId,
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
  });
}
