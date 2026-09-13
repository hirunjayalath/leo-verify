import { Resend } from "resend";
import { buildVerificationPath } from "@/lib/certificates/token";

export async function sendCertificateEmail(input: {
  to: string;
  recipientName: string;
  uniqueId: string;
  verificationToken: string;
  eventName: string;
  clubName: string;
  pdfUrl?: string | null;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, skipped: true, error: "RESEND_API_KEY not configured" };
  }

  const from =
    process.env.EMAIL_FROM || "LeoVerify <certificates@leoverify.org>";
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const verifyUrl = `${base}${buildVerificationPath(input.uniqueId, input.verificationToken)}`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: input.to,
      subject: `Your certificate from ${input.clubName}`,
      html: `
        <p>Hi ${input.recipientName},</p>
        <p>Your certificate for <strong>${input.eventName}</strong> is ready.</p>
        <p>Certificate ID: <code>${input.uniqueId}</code></p>
        <p><a href="${verifyUrl}">Verify your certificate</a></p>
        ${input.pdfUrl ? `<p><a href="${input.pdfUrl}">Download PDF</a></p>` : ""}
        <p>— ${input.clubName} via LeoVerify</p>
      `,
    });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}
