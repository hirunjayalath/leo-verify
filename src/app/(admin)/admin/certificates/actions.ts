"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asClubAdmin } from "@/lib/auth";
import {
  issueCertificate,
  reissueCertificate,
  revokeCertificate,
} from "@/lib/certificates/issue";

export type ActionResult =
  | {
      ok: true;
      uniqueId?: string;
      verificationToken?: string;
      pdfUrl?: string | null;
      skipped?: boolean;
    }
  | { ok: false; error: string };

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
  return asClubAdmin(async (user) => {
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
      clubId: user.clubId!,
      actorUserId: user.id,
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
    return {
      ok: true,
      uniqueId: result.uniqueId,
      verificationToken: result.verificationToken,
      pdfUrl: result.pdfUrl,
      skipped: result.skipped,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Issuance failed",
    };
  }
  });
}

export async function revokeCertificateAction(
  formData: FormData,
): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || reason.length < 3) {
    return { ok: false, error: "Certificate id and reason are required" };
  }

  try {
    await revokeCertificate({
      certificateId: id,
      clubId: user.clubId!,
      actorUserId: user.id,
      reason,
    });
    revalidatePath("/admin/certificates");
    revalidatePath("/admin");
    revalidatePath("/admin/audit");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Revoke failed",
    };
  }
  });
}

export async function reissueCertificateAction(
  formData: FormData,
): Promise<ActionResult> {
  return asClubAdmin(async (user) => {
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, error: "Certificate id required" };

  try {
    const result = await reissueCertificate({
      certificateId: id,
      clubId: user.clubId!,
      actorUserId: user.id,
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
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Reissue failed",
    };
  }
  });
}
