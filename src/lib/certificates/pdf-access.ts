export type PdfAccessAdmin = {
  role: "club_admin" | "district_admin";
  clubId: string | null;
};

export type PdfAccessDecision =
  | { ok: true; via: "recipient" | "admin" }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export function canAccessCertificatePdf(input: {
  recipientEmail?: string | null;
  clubId: string;
  authEmail?: string | null;
  admin?: PdfAccessAdmin | null;
  recipientOwns?: boolean;
}): PdfAccessDecision {
  const authEmail = input.authEmail?.trim().toLowerCase() || null;
  const recipientEmail = input.recipientEmail?.trim().toLowerCase() || null;

  if (input.recipientOwns) {
    return { ok: true, via: "recipient" };
  }

  if (authEmail && recipientEmail && authEmail === recipientEmail) {
    return { ok: true, via: "recipient" };
  }

  if (
    input.admin &&
    (input.admin.role === "club_admin" ||
      input.admin.role === "district_admin") &&
    input.admin.clubId &&
    input.admin.clubId === input.clubId
  ) {
    return { ok: true, via: "admin" };
  }

  if (!authEmail && !input.admin) {
    return { ok: false, reason: "unauthenticated" };
  }
  return { ok: false, reason: "forbidden" };
}

export function recipientClaimLoginPath(): string {
  return "/login?next=/claim";
}

export function certificateAboutText(input: {
  recipientName: string;
  eventName: string;
  role: string;
  checkUrl: string;
}): string {
  return `${input.recipientName} — ${input.role}, ${input.eventName}. Checked on LeoVerify: ${input.checkUrl}`;
}
