import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type AuditAction =
  | "event.create"
  | "event.update"
  | "template.create"
  | "template.update"
  | "template.approve"
  | "template.reject"
  | "certificate.issue"
  | "certificate.revoke"
  | "certificate.reissue"
  | "import.start"
  | "club.create"
  | "user.invite";

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: AuditAction | string;
  targetType: string;
  targetId: string;
  clubId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
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
