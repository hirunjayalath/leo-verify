"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CertificateStatus } from "@/generated/prisma/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function claimCertificatesAction(formData: FormData) {
  const email = z.string().email().parse(String(formData.get("email") || ""));
  const name = String(formData.get("name") || "").trim();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseId: string | null = null;
  if (url && anonKey && process.env.AUTH_DEV_BYPASS !== "true") {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.email?.toLowerCase() !== email.toLowerCase()) {
      return {
        ok: false as const,
        error: "Sign in with the same email you want to claim.",
      };
    }
    supabaseId = user.id;
  }

  const baseSlug = slugify(name || email.split("@")[0] || "recipient");
  let slug = baseSlug;
  let i = 1;
  while (await prisma.recipient.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const recipient = await prisma.recipient.upsert({
    where: { email: email.toLowerCase() },
    update: {
      name: name || undefined,
      claimedAt: new Date(),
      supabaseId: supabaseId ?? undefined,
      slug: undefined, // keep existing slug if present
    },
    create: {
      email: email.toLowerCase(),
      name: name || null,
      slug,
      claimedAt: new Date(),
      supabaseId,
      publicProfile: false,
    },
  });

  if (!recipient.slug) {
    await prisma.recipient.update({
      where: { id: recipient.id },
      data: { slug },
    });
  }

  const updated = await prisma.certificate.updateMany({
    where: {
      recipientEmail: { equals: email, mode: "insensitive" },
      recipientId: null,
      status: CertificateStatus.issued,
    },
    data: { recipientId: recipient.id },
  });

  revalidatePath("/claim");
  revalidatePath(`/u/${recipient.slug ?? slug}`);
  return {
    ok: true as const,
    slug: recipient.slug ?? slug,
    claimed: updated.count,
  };
}

export async function updateProfileVisibilityAction(formData: FormData) {
  const email = z.string().email().parse(String(formData.get("email") || ""));
  const publicProfile = String(formData.get("publicProfile")) === "on";

  const recipient = await prisma.recipient.findUnique({ where: { email } });
  if (!recipient) return { ok: false as const, error: "Recipient not found" };

  await prisma.recipient.update({
    where: { id: recipient.id },
    data: { publicProfile },
  });

  if (recipient.slug) revalidatePath(`/u/${recipient.slug}`);
  return { ok: true as const };
}

export async function setCertificateUnlistedAction(formData: FormData) {
  const certificateId = String(formData.get("certificateId") || "");
  const email = z.string().email().parse(String(formData.get("email") || ""));
  const unlisted = String(formData.get("unlisted")) === "on";

  const recipient = await prisma.recipient.findUnique({ where: { email } });
  if (!recipient) return { ok: false as const, error: "Recipient not found" };

  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, recipientId: recipient.id },
  });
  if (!cert) return { ok: false as const, error: "Certificate not found" };

  await prisma.certificate.update({
    where: { id: cert.id },
    data: { unlisted },
  });

  if (recipient.slug) revalidatePath(`/u/${recipient.slug}`);
  return { ok: true as const };
}
