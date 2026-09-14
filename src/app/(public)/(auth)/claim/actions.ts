"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CertificateStatus } from "@/generated/prisma/client";
import { getSupabaseAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

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

  if (session.auth.email.toLowerCase() !== email.toLowerCase()) {
    return {
      ok: false as const,
      error: "Sign in with the same email you want to claim.",
    };
  }

  const supabaseId = session.auth.id;
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
      supabaseId,
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

  const linked = await prisma.certificate.findMany({
    where: {
      recipientId: recipient.id,
      status: CertificateStatus.issued,
    },
    include: { event: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  revalidatePath("/claim");
  revalidatePath(`/u/${recipient.slug ?? slug}`);
  return {
    ok: true as const,
    slug: recipient.slug ?? slug,
    claimed: updated.count,
    publicProfile: recipient.publicProfile,
    certificates: linked.map((c) => ({
      id: c.id,
      uniqueId: c.uniqueId,
      eventName: c.event.name,
      unlisted: c.unlisted,
      issueDate: c.issueDate.toISOString().slice(0, 10),
    })),
  };
}

export async function updateProfileVisibilityAction(formData: FormData) {
  const session = await requireRecipientSession();
  if (!session.ok) return session;

  const publicProfile = String(formData.get("publicProfile")) === "on";
  const recipient = await prisma.recipient.findFirst({
    where: {
      OR: [
        { supabaseId: session.auth.id },
        { email: { equals: session.auth.email, mode: "insensitive" } },
      ],
    },
  });
  if (!recipient) return { ok: false as const, error: "Recipient not found" };

  await prisma.recipient.update({
    where: { id: recipient.id },
    data: { publicProfile },
  });

  if (recipient.slug) revalidatePath(`/u/${recipient.slug}`);
  revalidatePath("/claim");
  return { ok: true as const, publicProfile };
}

export async function setCertificateUnlistedAction(formData: FormData) {
  const session = await requireRecipientSession();
  if (!session.ok) return session;

  const certificateId = String(formData.get("certificateId") || "");
  const unlisted = String(formData.get("unlisted")) === "on";

  const recipient = await prisma.recipient.findFirst({
    where: {
      OR: [
        { supabaseId: session.auth.id },
        { email: { equals: session.auth.email, mode: "insensitive" } },
      ],
    },
  });
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
  revalidatePath("/claim");
  return { ok: true as const };
}

export async function getRecipientDashboard() {
  const auth = await getSupabaseAuthUser();
  if (!auth) return null;

  const recipient = await prisma.recipient.findFirst({
    where: {
      OR: [
        { supabaseId: auth.id },
        { email: { equals: auth.email, mode: "insensitive" } },
      ],
    },
    include: {
      certificates: {
        where: { status: CertificateStatus.issued },
        include: { event: { select: { name: true } } },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!recipient) {
    return { authEmail: auth.email, recipient: null as null };
  }

  return {
    authEmail: auth.email,
    recipient: {
      id: recipient.id,
      email: recipient.email,
      name: recipient.name,
      slug: recipient.slug,
      publicProfile: recipient.publicProfile,
      certificates: recipient.certificates.map((c) => ({
        id: c.id,
        uniqueId: c.uniqueId,
        eventName: c.event.name,
        unlisted: c.unlisted,
        issueDate: c.issueDate.toISOString().slice(0, 10),
      })),
    },
  };
}
