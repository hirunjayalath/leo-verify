"use server";

import { asClubAdmin } from "@/lib/auth";
import {
  buildPdfZipManifest,
  exportVerifyUrlsCsv,
  resendIssuedCertificateEmail,
} from "@/lib/certificates/hub";

export async function exportVerifyUrlsCsvAction(eventId?: string) {
  return asClubAdmin((user) =>
    exportVerifyUrlsCsv({ clubId: user.clubId!, eventId }),
  );
}

export async function resendCertificateEmailAction(formData: FormData) {
  return asClubAdmin((user) => {
    const id = String(formData.get("certificateId") || "");
    return resendIssuedCertificateEmail({
      clubId: user.clubId!,
      certificateId: id,
    });
  });
}

export async function buildPdfZipManifestAction(eventId?: string) {
  return asClubAdmin((user) =>
    buildPdfZipManifest({ clubId: user.clubId!, eventId }),
  );
}
