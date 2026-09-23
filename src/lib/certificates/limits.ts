import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function assertWithinCertLimit(
  clubId: string,
  tx: PrismaClient = prisma,
): Promise<void> {
  const club = await tx.club.findUniqueOrThrow({ where: { id: clubId } });
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const count = await tx.certificate.count({
    where: { clubId, createdAt: { gte: start } },
  });
  if (count >= club.monthlyCertLimit) {
    throw new Error(
      `Monthly certificate limit reached (${club.monthlyCertLimit}). Contact your administrator to raise the quota.`,
    );
  }
}
