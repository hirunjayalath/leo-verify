import { prisma } from "@/lib/db";

export async function assertWithinCertLimit(clubId: string): Promise<void> {
  const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId } });
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const count = await prisma.certificate.count({
    where: { clubId, createdAt: { gte: start } },
  });
  if (count >= club.monthlyCertLimit) {
    throw new Error(
      `Monthly certificate limit reached (${club.monthlyCertLimit}). Upgrade plan to continue.`,
    );
  }
}
