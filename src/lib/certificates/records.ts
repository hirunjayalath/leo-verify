import { assertWithinCertLimit } from "@/lib/certificates/limits";
import {
  CertificateStatus,
  TemplateStatus,
  type PrismaClient,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { formatCertificateId } from "@/lib/certificates/id";
import { tokenForCertificate } from "@/lib/certificates/token";
import { allocateSequence } from "@/lib/certificates/sequence";
import { prisma } from "@/lib/db";
import { logOps } from "@/lib/observability";

export type IssueRecordCreatedOutcome = {
  kind: "issued" | "skipped";
  certificateId: string;
};

export type IssueCertificateInput = {
  eventId: string;
  clubId: string;
  templateId?: string | null;
  actorUserId: string;
  actorSupabaseId: string;
  recipientName: string;
  recipientEmail?: string | null;
  role: string;
  achievement?: string | null;
  issueDate?: Date;
  sendEmail?: boolean;
  backgroundBytes?: Uint8Array;
  onRecordCreated?: (
    tx: PrismaClient,
    outcome: IssueRecordCreatedOutcome,
  ) => Promise<void>;
};

export type IssueCertificateResult = {
  id: string;
  uniqueId: string;
  verificationToken: string;
  pdfUrl: string | null;
  skipped?: boolean;
  emailSent?: boolean;
  pdfAttachFailed?: boolean;
};

export type CreatedCertificateRow = {
  id: string;
  uniqueId: string;
  verificationToken: string;
  recipientName: string;
  recipientEmail: string | null;
  role: string;
  achievement: string | null;
};

function uniqueViolationCode(error: unknown, depth = 0): string | undefined {
  if (depth > 4 || typeof error !== "object" || error === null) return undefined;
  const record = error as {
    code?: unknown;
    kind?: unknown;
    cause?: unknown;
    meta?: unknown;
  };
  if (typeof record.code === "string") return record.code;
  if (record.kind === "UniqueConstraintViolation") return "23505";
  if (record.cause) return uniqueViolationCode(record.cause, depth + 1);
  if (record.meta) return uniqueViolationCode(record.meta, depth + 1);
  return undefined;
}

function isUniqueViolation(error: unknown): boolean {
  const code = uniqueViolationCode(error);
  return code === "P2002" || code === "23505";
}

function tokenFromRow(row: {
  uniqueId: string;
  recipientName: string;
  eventId: string;
  clubId: string;
  issueDate: Date;
  role: string;
  tokenVersion?: number | null;
}) {
  return tokenForCertificate(row);
}

export async function requireApprovedTemplate(
  eventId: string,
  clubId: string,
  tx: PrismaClient = prisma,
  templateId?: string | null,
) {
  const template = templateId
    ? await tx.certificateTemplate.findFirst({
        where: {
          id: templateId,
          eventId,
          clubId,
          status: TemplateStatus.approved,
        },
      })
    : await tx.certificateTemplate.findFirst({
        where: {
          eventId,
          clubId,
          status: TemplateStatus.approved,
        },
        orderBy: { updatedAt: "desc" },
      });
  if (!template) {
    throw new Error(
      "No approved template for this event. Approve a template before issuing.",
    );
  }
  return template;
}

async function findIssuedDuplicate(
  tx: PrismaClient,
  input: {
    eventId: string;
    templateId?: string | null;
    recipientName: string;
    recipientEmail: string | null;
  },
) {
  if (input.recipientEmail) {
    return tx.certificate.findFirst({
      where: {
        eventId: input.eventId,
        templateId: input.templateId ?? undefined,
        recipientEmail: input.recipientEmail,
        recipientName: input.recipientName,
        status: CertificateStatus.issued,
      },
    });
  }
  return tx.certificate.findFirst({
    where: {
      eventId: input.eventId,
      templateId: input.templateId ?? undefined,
      recipientName: input.recipientName,
      recipientEmail: null,
      status: CertificateStatus.issued,
    },
  });
}

export type CreateCertificateRecordResult =
  | { skipped: true; result: IssueCertificateResult }
  | {
      skipped: false;
      certificate: CreatedCertificateRow;
      uniqueId: string;
      verificationToken: string;
      issueDateIso: string;
      template: Awaited<ReturnType<typeof requireApprovedTemplate>>;
      club: {
        id: string;
        name: string;
        logoUrl: string | null;
        primaryColor: string;
        accentColor: string;
        code: string;
      };
      event: { id: string; name: string };
    };

export async function createCertificateRecord(
  input: IssueCertificateInput,
  tx: PrismaClient = prisma,
): Promise<CreateCertificateRecordResult> {
  const issueDate = input.issueDate ?? new Date();
  const year = issueDate.getUTCFullYear();
  const club = await tx.club.findUniqueOrThrow({
    where: { id: input.clubId },
  });
  const event = await tx.event.findFirst({
    where: { id: input.eventId, clubId: input.clubId },
  });
  if (!event) throw new Error("Event not found for club");

  const template = await requireApprovedTemplate(
    input.eventId,
    input.clubId,
    tx,
    input.templateId,
  );

  const recipientName = input.recipientName.trim();
  const recipientEmail = input.recipientEmail?.trim().toLowerCase() || null;
  const role = input.role.trim();

  const existing = await findIssuedDuplicate(tx, {
    eventId: input.eventId,
    templateId: template.id,
    recipientName,
    recipientEmail,
  });
  if (existing) {
    return {
      skipped: true,
      result: {
        id: existing.id,
        uniqueId: existing.uniqueId,
        verificationToken: tokenFromRow(existing),
        pdfUrl: existing.pdfUrl,
        skipped: true,
      },
    };
  }

  await assertWithinCertLimit(input.clubId, tx);

  let recipientId: string | null = null;
  if (recipientEmail) {
    const rows = await tx.$queryRaw<Array<{ id: string | null }>>`
      SELECT public.recipient_id_for_email(${recipientEmail}) AS id
    `;
    recipientId = rows[0]?.id ?? null;
  }

  const issueDateIso = issueDate.toISOString().slice(0, 10);
  const tokenVersion = 1;

  let certificate: CreatedCertificateRow | undefined;
  let uniqueId = "";
  let verificationToken = "";

  for (let attempt = 0; attempt < 8; attempt++) {
    const sequence = await allocateSequence(input.clubId, year, tx);
    uniqueId = formatCertificateId(club.code, year, sequence);
    verificationToken = tokenForCertificate({
      uniqueId,
      recipientName,
      eventId: input.eventId,
      clubId: input.clubId,
      issueDate: issueDateIso,
      role,
      tokenVersion,
    });

    try {
      const created = await tx.certificate.create({
        data: {
          uniqueId,
          tokenVersion,
          clubId: input.clubId,
          eventId: input.eventId,
          templateId: template.id,
          recipientName,
          recipientEmail,
          role,
          achievement: input.achievement?.trim() || null,
          issueDate,
          status: CertificateStatus.issued,
          recipientId,
        },
      });
      certificate = {
        id: created.id,
        uniqueId: created.uniqueId,
        verificationToken,
        recipientName: created.recipientName,
        recipientEmail: created.recipientEmail,
        role: created.role,
        achievement: created.achievement,
      };
      break;
    } catch (error) {
      if (isUniqueViolation(error)) {
        const raced =
          (await findIssuedDuplicate(tx, {
            eventId: input.eventId,
            templateId: template.id,
            recipientName,
            recipientEmail,
          })) ??
          (await tx.certificate.findFirst({
            where: {
              eventId: input.eventId,
              templateId: template.id,
              recipientName,
              recipientEmail,
              status: CertificateStatus.issued,
            },
          }));
        if (raced) {
          return {
            skipped: true,
            result: {
              id: raced.id,
              uniqueId: raced.uniqueId,
              verificationToken: tokenFromRow(raced),
              pdfUrl: raced.pdfUrl,
              skipped: true,
            },
          };
        }
        const takenId = await tx.certificate.findUnique({
          where: { uniqueId },
          select: { id: true },
        });
        if (takenId) {
          logOps("certificate.sequence_collision", {
            clubId: input.clubId,
            attempt,
          });
          continue;
        }
        throw error;
      }
      throw error;
    }
  }

  if (!certificate) {
    logOps("certificate.allocate_failed", { clubId: input.clubId });
    throw new Error("Could not allocate a unique certificate ID. Try again.");
  }

  return {
    skipped: false,
    certificate,
    uniqueId,
    verificationToken,
    issueDateIso,
    template,
    club,
    event,
  };
}

export async function attachCertificatePdf(
  input: {
    certificateId: string;
    pdfUrl: string;
    pdfKey: string;
  },
  tx: PrismaClient = prisma,
): Promise<void> {
  await tx.certificate.update({
    where: { id: input.certificateId },
    data: { pdfUrl: input.pdfUrl, pdfKey: input.pdfKey },
  });
}

export async function auditCertificateIssue(
  input: {
    actorUserId: string;
    certificateId: string;
    clubId: string;
    uniqueId: string;
    recipientName: string;
    eventId: string;
  },
  tx: PrismaClient = prisma,
): Promise<void> {
  await writeAuditLog({
    actorUserId: input.actorUserId === "system" ? null : input.actorUserId,
    action: "certificate.issue",
    targetType: "Certificate",
    targetId: input.certificateId,
    clubId: input.clubId,
    metadata: {
      uniqueId: input.uniqueId,
      recipientName: input.recipientName,
      eventId: input.eventId,
    },
    client: tx,
  });
}
