import { Resend } from "resend";
import { buildVerificationPath } from "@/lib/certificates/token";
import { getPublicEnv } from "@/lib/env";
import { escapeHtml } from "@/lib/html-escape";

export function buildCertificateEmailHtml(input: {
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  pdfDownloadPath?: string | null;
  appBaseUrl?: string;
  clubLogoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}): string {
  const base = (
    input.appBaseUrl ??
    getPublicEnv().NEXT_PUBLIC_APP_URL
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
  const primary = escapeHtml(input.primaryColor || "#323232");
  const accent = escapeHtml(input.accentColor || "#38a3e3");
  const logo = input.clubLogoUrl
    ? `<img src="${escapeHtml(input.clubLogoUrl)}" alt="" width="48" height="48" style="border-radius:8px;margin-bottom:12px" />`
    : "";

  return `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:${primary}">
        ${logo}
        <p>Hi ${name},</p>
        <p>Your certificate for <strong>${eventName}</strong> is ready.</p>
        <p>Certificate ID: <code>${uniqueId}</code></p>
        <p><a href="${safeVerify}" style="color:${accent}">Verify your certificate</a></p>
        ${safePdf ? `<p><a href="${safePdf}" style="color:${accent}">Download PDF</a></p>` : ""}
        <p style="margin-top:24px;font-size:13px;color:#646464">— ${clubName} via LeoVerify</p>
        </div>
      `;
}

export async function sendCertificateEmail(input: {
  to: string;
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  pdfUrl?: string | null;
  clubLogoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
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
        clubLogoUrl: input.clubLogoUrl,
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
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

/** Alias used by hub resend action */
export const resendCertificateEmail = sendCertificateEmail;
