import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

async function existingMaxSequence(
  tx: PrismaClient,
  clubId: string,
  year: number,
): Promise<number> {
  const club = await tx.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { code: true },
  });
  const prefix = `LEO-${club.code.toUpperCase()}-${year}-`;
  const latest = await tx.certificate.findFirst({
    where: { clubId, uniqueId: { startsWith: prefix } },
    orderBy: { uniqueId: "desc" },
    select: { uniqueId: true },
  });
  if (!latest) return 0;
  const seq = Number(latest.uniqueId.slice(-6));
  return Number.isFinite(seq) ? seq : 0;
}

export async function allocateSequence(
  clubId: string,
  year: number,
  tx: PrismaClient = prisma,
): Promise<number> {
  const floor = await existingMaxSequence(tx, clubId, year);
  const rows = await tx.$queryRaw<Array<{ next: number }>>`
    INSERT INTO "ClubCertSequence" ("clubId", "year", "next")
    VALUES (${clubId}, ${year}, ${floor + 1})
    ON CONFLICT ("clubId", "year")
    DO UPDATE SET "next" = GREATEST(
      "ClubCertSequence"."next" + 1,
      ${floor + 1}
    )
    RETURNING "next"
  `;
  const next = rows[0]?.next;
  if (!next) throw new Error("Could not allocate a certificate sequence");
  return next;
}
