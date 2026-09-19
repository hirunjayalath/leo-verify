"use server";

import { requireClubAdmin } from "@/lib/auth";
import {
  buildPdfZipManifest,
  exportVerifyUrlsCsv,
  resendIssuedCertificateEmail,
} from "@/lib/certificates/hub";

export async function exportVerifyUrlsCsvAction(eventId?: string) {
  const user = await requireClubAdmin();
  return exportVerifyUrlsCsv({ clubId: user.clubId!, eventId });
}

export async function resendCertificateEmailAction(formData: FormData) {
  const user = await requireClubAdmin();
  const id = String(formData.get("certificateId") || "");
  return resendIssuedCertificateEmail({
    clubId: user.clubId!,
    certificateId: id,
  });
}

export async function buildPdfZipManifestAction(eventId?: string) {
  const user = await requireClubAdmin();
  return buildPdfZipManifest({ clubId: user.clubId!, eventId });
}
