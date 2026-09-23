import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type AuditAction =
  | "event.create"
  | "event.update"
  | "template.create"
  | "template.update"
  | "template.approve"
  | "template.reject"
  | "template.revert"
  | "template.signature.upload"
  | "template.duplicate"
  | "certificate.issue"
  | "certificate.revoke"
  | "certificate.reissue"
  | "import.start"
  | "club.create"
  | "club.branding.update"
  | "user.invite";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  clubId?: string | null;
  metadata?: Prisma.InputJsonValue;
  client?: PrismaClient;
}) {
  const db = input.client ?? prisma;
  return db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      clubId: input.clubId ?? null,
      metadata: input.metadata,
    },
  });
}
