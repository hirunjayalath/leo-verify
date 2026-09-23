"use server";

import { z } from "zod";
import { fail } from "@/lib/action-result";
import { asClubAdmin } from "@/lib/auth";
import {
  buildPdfZipManifest,
  exportVerifyUrlsCsv,
  resendIssuedCertificateEmail,
} from "@/lib/certificates/hub";
import { captureException } from "@/lib/observability";

const certificateIdSchema = z.object({
  certificateId: z.string().min(1),
});

export async function exportVerifyUrlsCsvAction(eventId?: string) {
  try {
    return await asClubAdmin((user) =>
      exportVerifyUrlsCsv({ clubId: user.clubId, eventId }),
    );
  } catch (error) {
    await captureException(error, { phase: "hub.export-csv" });
    return fail("Could not export verification URLs");
  }
}

export async function resendCertificateEmailAction(formData: FormData) {
  try {
    return await asClubAdmin((user) => {
      const parsed = certificateIdSchema.safeParse({
        certificateId: formData.get("certificateId"),
      });
      if (!parsed.success) return fail("Certificate id required");
      return resendIssuedCertificateEmail({
        clubId: user.clubId,
        certificateId: parsed.data.certificateId,
      });
    });
  } catch (error) {
    await captureException(error, { phase: "hub.resend" });
    return fail("Could not resend email");
  }
}

export async function buildPdfZipManifestAction(eventId?: string) {
  try {
    return await asClubAdmin((user) =>
      buildPdfZipManifest({ clubId: user.clubId, eventId }),
    );
  } catch (error) {
    await captureException(error, { phase: "hub.zip" });
    return fail("Could not build PDF list");
  }
}
