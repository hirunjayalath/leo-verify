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

/** Prefer supabaseId; fall back to unbound email match only. */
async function findRecipientForAuth(auth: { id: string; email: string }) {
  const byId = await prisma.recipient.findFirst({
    where: { supabaseId: auth.id },
  });
  if (byId) return byId;

  const byEmail = await prisma.recipient.findFirst({
    where: {
      email: { equals: auth.email, mode: "insensitive" },
      OR: [{ supabaseId: null }, { supabaseId: "" }],
    },
  });
  return byEmail;
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
  const existing = await prisma.recipient.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (
    existing?.supabaseId &&
    existing.supabaseId !== supabaseId
  ) {
    return {
      ok: false as const,
      error: "Already claimed. Contact support to re-bind this account.",
    };
  }

  const baseSlug = slugify(name || email.split("@")[0] || "recipient");
  let slug = baseSlug;
  let i = 1;
  while (await prisma.recipient.findUnique({ where: { slug } })) {
    if (existing?.slug === slug) break;
    slug = `${baseSlug}-${i++}`;
  }

  const recipient = existing
    ? await prisma.recipient.update({
        where: { id: existing.id },
        data: {
          name: name || undefined,
          claimedAt: new Date(),
          supabaseId,
          slug: existing.slug ?? slug,
        },
      })
    : await prisma.recipient.create({
        data: {
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
  const recipient = await findRecipientForAuth(session.auth);
  if (!recipient) return { ok: false as const, error: "Recipient not found" };
  if (recipient.supabaseId && recipient.supabaseId !== session.auth.id) {
    return { ok: false as const, error: "Not authorized" };
  }

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

  const recipient = await findRecipientForAuth(session.auth);
  if (!recipient) return { ok: false as const, error: "Recipient not found" };
  if (recipient.supabaseId && recipient.supabaseId !== session.auth.id) {
    return { ok: false as const, error: "Not authorized" };
  }

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

  const byId = await prisma.recipient.findFirst({
    where: { supabaseId: auth.id },
    include: {
      certificates: {
        where: { status: CertificateStatus.issued },
        include: { event: { select: { name: true } } },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  const recipient =
    byId ??
    (await prisma.recipient.findFirst({
      where: {
        email: { equals: auth.email, mode: "insensitive" },
        OR: [{ supabaseId: null }, { supabaseId: "" }],
      },
      include: {
        certificates: {
          where: { status: CertificateStatus.issued },
          include: { event: { select: { name: true } } },
          orderBy: { issueDate: "desc" },
        },
      },
    }));

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
