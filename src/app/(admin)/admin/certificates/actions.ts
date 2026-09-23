"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClubAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import {
  issueCertificate,
  PDF_ATTACH_FAILED_MESSAGE,
  reissueCertificate,
  revokeCertificate,
} from "@/lib/certificates/issue";
import { captureException } from "@/lib/observability";

export type { ActionResult };

const issueSchema = z.object({
  eventId: z.string().min(1),
  recipientName: z.string().trim().min(2).max(200),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  role: z.string().trim().min(1).max(200),
  achievement: z.string().trim().max(200).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
});

export async function issueOneCertificateAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const parsed = issueSchema.safeParse({
    eventId: formData.get("eventId"),
    recipientName: formData.get("recipientName"),
    recipientEmail: formData.get("recipientEmail") || "",
    role: formData.get("role"),
    achievement: formData.get("achievement") || "",
    issueDate: formData.get("issueDate") || "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const result = await issueCertificate({
      eventId: parsed.data.eventId,
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      recipientName: parsed.data.recipientName,
      recipientEmail: parsed.data.recipientEmail || null,
      role: parsed.data.role,
      achievement: parsed.data.achievement || null,
      issueDate: parsed.data.issueDate
        ? new Date(parsed.data.issueDate)
        : new Date(),
    });

    revalidatePath("/admin/certificates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    if (result.pdfAttachFailed) {
      return { ok: false, error: PDF_ATTACH_FAILED_MESSAGE };
    }
    return {
      ok: true,
      uniqueId: result.uniqueId,
      verificationToken: result.verificationToken,
      pdfUrl: result.pdfUrl,
      skipped: result.skipped,
    };
  } catch (error) {
    await captureException(error, { phase: "issue" });
    return { ok: false, error: "Issuance failed" };
  }
}

export async function revokeCertificateAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || reason.length < 3) {
    return { ok: false, error: "Certificate id and reason are required" };
  }

  try {
    await revokeCertificate({
      certificateId: id,
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      reason,
    });
    revalidatePath("/admin/certificates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    return { ok: true };
  } catch (error) {
    await captureException(error, { phase: "revoke" });
    return { ok: false, error: "Revoke failed" };
  }
}

export async function reissueCertificateAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Certificate id required" };

  try {
    const result = await reissueCertificate({
      certificateId: id,
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
    });
    revalidatePath("/admin/certificates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    return {
      ok: true,
      uniqueId: result.uniqueId,
      verificationToken: result.verificationToken,
      pdfUrl: result.pdfUrl,
    };
  } catch (error) {
    await captureException(error, { phase: "reissue" });
    return { ok: false, error: "Reissue failed" };
  }
}
