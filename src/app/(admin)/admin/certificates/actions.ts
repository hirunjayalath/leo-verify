"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { requireClubAdmin } from "@/lib/auth";
import {
  issueCertificate,
  PDF_ATTACH_FAILED_MESSAGE,
  reissueCertificate,
  revokeCertificate,
} from "@/lib/certificates/issue";
import { captureException } from "@/lib/observability";

const issueSchema = z.object({
  eventId: z.string().min(1),
  recipientName: z.string().trim().min(2).max(200),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  role: z.string().trim().min(1).max(200),
  achievement: z.string().trim().max(200).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
});

const revokeSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(3),
});

const idSchema = z.object({
  id: z.string().min(1),
});

export async function issueOneCertificateAction(
  formData: FormData,
): Promise<ActionResult<{
  uniqueId?: string;
  verificationToken?: string;
  pdfUrl?: string | null;
  skipped?: boolean;
}>> {
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
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
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
      return fail(PDF_ATTACH_FAILED_MESSAGE);
    }
    return ok({
      uniqueId: result.uniqueId,
      verificationToken: result.verificationToken,
      pdfUrl: result.pdfUrl,
      skipped: result.skipped,
    });
  } catch (error) {
    await captureException(error, { phase: "issue" });
    return fail("Issuance failed");
  }
}

export async function revokeCertificateAction(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireClubAdmin();
  const parsed = revokeSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return fail("Certificate id and reason are required");
  }

  try {
    await revokeCertificate({
      certificateId: parsed.data.id,
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
      reason: parsed.data.reason,
    });
    revalidatePath("/admin/certificates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    return ok();
  } catch (error) {
    await captureException(error, { phase: "revoke" });
    return fail("Revoke failed");
  }
}

export async function reissueCertificateAction(
  formData: FormData,
): Promise<ActionResult<{
  uniqueId?: string;
  verificationToken?: string;
  pdfUrl?: string | null;
}>> {
  const user = await requireClubAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return fail("Certificate id required");

  try {
    const result = await reissueCertificate({
      certificateId: parsed.data.id,
      clubId: user.clubId,
      actorUserId: user.id,
      actorSupabaseId: user.supabaseId,
    });
    revalidatePath("/admin/certificates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    return ok({
      uniqueId: result.uniqueId,
      verificationToken: result.verificationToken,
      pdfUrl: result.pdfUrl,
    });
  } catch (error) {
    await captureException(error, { phase: "reissue" });
    return fail("Reissue failed");
  }
}
