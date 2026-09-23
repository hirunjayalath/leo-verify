import { CertificateStatus } from "@/generated/prisma/client";
import {
  buildPdfDownloadPath,
  buildVerificationPath,
  tokenForCertificate,
} from "@/lib/certificates/token";
import { slugifyPublic } from "@/lib/branding";
import { prisma, withRlsContext } from "@/lib/db";

function dashboardCertPaths(cert: {
  uniqueId: string;
  recipientName: string;
  eventId: string;
  clubId: string;
  issueDate: Date;
  role: string;
  tokenVersion?: number | null;
  pdfKey: string | null;
  pdfUrl: string | null;
  status: CertificateStatus;
}) {
  const token = tokenForCertificate(cert);
  const verifyPath = buildVerificationPath(cert.uniqueId, token);
  const pdfPath =
    cert.status === CertificateStatus.issued && (cert.pdfKey || cert.pdfUrl)
      ? buildPdfDownloadPath(cert.uniqueId, token)
      : null;
  return { verifyPath, pdfPath };
}

function dashboardEventName(event: { name: string } | null | undefined) {
  return event?.name ?? "Certificate";
}

function withRecipient<T>(
  auth: { id: string; email: string },
  fn: () => Promise<T>,
) {
  return withRlsContext(auth.id, fn, { recipientEmail: auth.email });
}

/** Prefer supabaseId; fall back to unbound email match only. */
export async function findRecipientForAuth(auth: { id: string; email: string }) {
  return withRecipient(auth, async () => {
    const byId = await prisma.recipient.findFirst({
      where: { supabaseId: auth.id },
    });
    if (byId) return byId;

    return prisma.recipient.findFirst({
      where: {
        email: { equals: auth.email, mode: "insensitive" },
        OR: [{ supabaseId: null }, { supabaseId: "" }],
      },
    });
  });
}

export async function claimCertificates(input: {
  auth: { id: string; email: string };
  email: string;
  name: string;
}) {
  if (input.auth.email.toLowerCase() !== input.email.toLowerCase()) {
    return {
      ok: false as const,
      error: "Sign in with the same email you want to claim.",
    };
  }

  const supabaseId = input.auth.id;
  const email = input.email.toLowerCase();
  return withRecipient(input.auth, async () => {
  const existing = await prisma.recipient.findUnique({
    where: { email },
  });

  if (existing?.supabaseId && existing.supabaseId !== supabaseId) {
    return {
      ok: false as const,
      error: "Already claimed. Contact support to re-bind this account.",
    };
  }

  const baseSlug = slugifyPublic(input.name || email.split("@")[0] || "recipient");
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
          name: input.name || undefined,
          claimedAt: new Date(),
          supabaseId,
          slug: existing.slug ?? slug,
        },
      })
    : await prisma.recipient.create({
        data: {
          email,
          name: input.name || null,
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

  return {
    ok: true as const,
    slug: recipient.slug ?? slug,
    claimed: updated.count,
    publicProfile: recipient.publicProfile,
    certificates: linked.map((c) => ({
      id: c.id,
      uniqueId: c.uniqueId,
      eventName: dashboardEventName(c.event),
      unlisted: c.unlisted,
      issueDate: c.issueDate.toISOString().slice(0, 10),
      ...dashboardCertPaths(c),
    })),
  };
  });
}

export async function updateProfileVisibility(input: {
  auth: { id: string; email: string };
  publicProfile: boolean;
}) {
  const recipient = await findRecipientForAuth(input.auth);
  if (!recipient) return { ok: false as const, error: "Recipient not found" };
  if (recipient.supabaseId && recipient.supabaseId !== input.auth.id) {
    return { ok: false as const, error: "Not authorized" };
  }

  await withRecipient(input.auth, () =>
    prisma.recipient.update({
      where: { id: recipient.id },
      data: { publicProfile: input.publicProfile },
    }),
  );

  return {
    ok: true as const,
    publicProfile: input.publicProfile,
    slug: recipient.slug,
  };
}

export async function setCertificateUnlisted(input: {
  auth: { id: string; email: string };
  certificateId: string;
  unlisted: boolean;
}) {
  const recipient = await findRecipientForAuth(input.auth);
  if (!recipient) return { ok: false as const, error: "Recipient not found" };
  if (recipient.supabaseId && recipient.supabaseId !== input.auth.id) {
    return { ok: false as const, error: "Not authorized" };
  }

  return withRecipient(input.auth, async () => {
    const cert = await prisma.certificate.findFirst({
      where: { id: input.certificateId, recipientId: recipient.id },
    });
    if (!cert) return { ok: false as const, error: "Certificate not found" };

    await prisma.certificate.update({
      where: { id: cert.id },
      data: { unlisted: input.unlisted },
    });

    return { ok: true as const, slug: recipient.slug };
  });
}

export async function getRecipientDashboardData(auth: {
  id: string;
  email: string;
}) {
  return withRecipient(auth, async () => {
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
        eventName: dashboardEventName(c.event),
        unlisted: c.unlisted,
        issueDate: c.issueDate.toISOString().slice(0, 10),
        ...dashboardCertPaths(c),
      })),
    },
  };
  });
}
