import { Resend } from "resend";
import { buildVerificationPath } from "@/lib/certificates/token";
import { escapeHtml } from "@/lib/html-escape";

export function buildCertificateEmailHtml(input: {
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  pdfDownloadPath?: string | null;
  appBaseUrl?: string;
}): string {
  const base = (
    input.appBaseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ""
  ).replace(/\/$/, "");
  const verifyUrl = `${base}${buildVerificationPath(input.uniqueId, input.verificationToken)}`;
  const pdfHref = input.pdfDownloadPath
    ? input.pdfDownloadPath.startsWith("http")
      ? input.pdfDownloadPath
      : `${base}${input.pdfDownloadPath}`
    : null;

  const name = escapeHtml(input.recipientName);
  const eventName = escapeHtml(input.eventName);
  const clubName = escapeHtml(input.clubName);
  const uniqueId = escapeHtml(input.uniqueId);
  const safeVerify = escapeHtml(verifyUrl);
  const safePdf = pdfHref ? escapeHtml(pdfHref) : null;

  return `
        <p>Hi ${name},</p>
        <p>Your certificate for <strong>${eventName}</strong> is ready.</p>
        <p>Certificate ID: <code>${uniqueId}</code></p>
        <p><a href="${safeVerify}">Verify your certificate</a></p>
        ${safePdf ? `<p><a href="${safePdf}">Download PDF</a></p>` : ""}
        <p>— ${clubName} via LeoVerify</p>
      `;
}

export async function sendCertificateEmail(input: {
  to: string;
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  /** Prefer gated path `/api/certificates/.../pdf?t=...` over raw storage URLs. */
  pdfUrl?: string | null;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  const from =
    process.env.EMAIL_FROM || "LeoVerify <certificates@leoverify.org>";

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.to,
      subject: `Your certificate from ${input.clubName.replace(/[\r\n]/g, "")}`,
      html: buildCertificateEmailHtml({
        recipientName: input.recipientName,
        uniqueId: input.uniqueId,
        verificationToken: input.verificationToken,
        eventName: input.eventName,
        clubName: input.clubName,
        pdfDownloadPath: input.pdfUrl,
      }),
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}
