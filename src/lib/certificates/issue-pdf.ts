import { renderCertificatePdf } from "@/lib/certificates/render-pdf";
import { buildObjectKey, deleteObject, uploadObject } from "@/lib/storage/r2";

type TemplateForPdf = {
  backgroundUrl: string;
  layout: unknown;
  pageSize: string;
};

export async function renderAndUploadCertificatePdf(input: {
  clubId: string;
  template: TemplateForPdf;
  backgroundBytes?: Uint8Array;
  recipientName: string;
  role: string;
  issueDateIso: string;
  uniqueId: string;
  verificationToken: string;
  achievement: string | null;
  eventName: string;
  clubName: string;
}): Promise<{ url: string; key: string }> {
  const pdfBytes = await renderCertificatePdf({
    backgroundUrl: input.template.backgroundUrl,
    backgroundBytes: input.backgroundBytes,
    layout: input.template.layout,
    recipientName: input.recipientName,
    role: input.role,
    issueDate: input.issueDateIso,
    uniqueId: input.uniqueId,
    verificationToken: input.verificationToken,
    achievement: input.achievement,
    eventName: input.eventName,
    clubName: input.clubName,
    pageSize:
      input.template.pageSize === "a4_portrait"
        ? "a4_portrait"
        : "a4_landscape",
  });
  return uploadObject({
    key: buildObjectKey("certificates", input.clubId, "pdf"),
    body: Buffer.from(pdfBytes),
    contentType: "application/pdf",
    cacheControl: "private, max-age=3600",
  });
}

export async function deleteCertificatePdfObject(
  pdfKey: string | null | undefined,
): Promise<void> {
  if (!pdfKey) return;
  try {
    await deleteObject(pdfKey);
  } catch {
    /* best-effort */
  }
}
