"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAuthUser } from "@/lib/auth";
import {
  claimCertificates,
  getRecipientDashboardData,
  setCertificateUnlisted,
  updateProfileVisibility,
} from "@/lib/recipients/service";

async function requireRecipientSession() {
  const auth = await getSupabaseAuthUser();
  if (!auth) {
    return {
      ok: false as const,
      error: "Sign in with the email used on your certificates to continue.",
    };
  }
  return { ok: true as const, auth };
}

export async function claimCertificatesAction(formData: FormData) {
  const session = await requireRecipientSession();
  if (!session.ok) return session;

  const email = z.string().email().parse(String(formData.get("email") || ""));
  const name = String(formData.get("name") || "").trim();
  const result = await claimCertificates({
    auth: session.auth,
    email,
    name,
  });
  if (!result.ok) return result;

  revalidatePath("/claim");
  revalidatePath(`/u/${result.slug}`);
  return result;
}

export async function updateProfileVisibilityAction(formData: FormData) {
  const session = await requireRecipientSession();
  if (!session.ok) return session;

  const result = await updateProfileVisibility({
    auth: session.auth,
    publicProfile: String(formData.get("publicProfile")) === "on",
  });
  if (!result.ok) return result;

  if (result.slug) revalidatePath(`/u/${result.slug}`);
  revalidatePath("/claim");
  return { ok: true as const, publicProfile: result.publicProfile };
}

export async function setCertificateUnlistedAction(formData: FormData) {
  const session = await requireRecipientSession();
  if (!session.ok) return session;

  const result = await setCertificateUnlisted({
    auth: session.auth,
    certificateId: String(formData.get("certificateId") || ""),
    unlisted: String(formData.get("unlisted")) === "on",
  });
  if (!result.ok) return result;

  if (result.slug) revalidatePath(`/u/${result.slug}`);
  revalidatePath("/claim");
  return { ok: true as const };
}

export async function getRecipientDashboard() {
  const auth = await getSupabaseAuthUser();
  if (!auth) return null;
  return getRecipientDashboardData(auth);
}
