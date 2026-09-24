import { CertificateStatus, UserRole } from "@/generated/prisma/client";
import { type ActionResult, fail, ok } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit";
import { prismaService } from "@/lib/db";

export type PlatformClubReportRow = {
  clubId: string;
  name: string;
  code: string;
  events: number;
  issued: number;
  revoked: number;
};

export async function getPlatformClubReport(): Promise<PlatformClubReportRow[]> {
  const clubs = await prismaService.club.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      _count: { select: { events: true } },
    },
  });
  const counts = await prismaService.certificate.groupBy({
    by: ["clubId", "status"],
    _count: { _all: true },
  });
  const tally = new Map<string, { issued: number; revoked: number }>();
  for (const row of counts) {
    const current = tally.get(row.clubId) ?? { issued: 0, revoked: 0 };
    if (row.status === CertificateStatus.issued) current.issued = row._count._all;
    if (row.status === CertificateStatus.revoked) current.revoked = row._count._all;
    tally.set(row.clubId, current);
  }
  return clubs.map((club) => {
    const stats = tally.get(club.id) ?? { issued: 0, revoked: 0 };
    return {
      clubId: club.id,
      name: club.name,
      code: club.code,
      events: club._count.events,
      issued: stats.issued,
      revoked: stats.revoked,
    };
  });
}

export async function createDistrict(input: {
  actorUserId: string;
  name: string;
  code: string;
}): Promise<ActionResult<{ id?: string }>> {
  const code = input.code.trim().toUpperCase();
  if (code.length < 2 || code.length > 12) {
    return fail("District code must be 2–12 characters");
  }
  const existing = await prismaService.district.findUnique({ where: { code } });
  if (existing) return fail("That district code already exists");

  const district = await prismaService.district.create({
    data: { name: input.name.trim(), code },
  });
  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "district.create",
    targetType: "District",
    targetId: district.id,
    metadata: { code },
  });
  return ok({ id: district.id });
}

export async function inviteDistrictAdmin(input: {
  actorUserId: string;
  districtId: string;
  clubId: string;
  email: string;
  name?: string;
  supabaseId: string;
}): Promise<ActionResult<{ id?: string }>> {
  const district = await prismaService.district.findUnique({
    where: { id: input.districtId },
  });
  if (!district) return fail("District not found");
  const club = await prismaService.club.findFirst({
    where: { id: input.clubId, districtId: input.districtId },
  });
  if (!club) return fail("Club not found in that district");

  const email = input.email.trim().toLowerCase();
  const existing = await prismaService.user.findUnique({
    where: { email },
    include: { club: { select: { code: true } } },
  });
  if (existing?.role === UserRole.club_admin && existing.club?.code === "UOM") {
    return fail("The UOM operator account cannot become a district admin");
  }

  const user = existing
    ? await prismaService.user.update({
        where: { id: existing.id },
        data: {
          supabaseId: input.supabaseId,
          role: UserRole.district_admin,
          districtId: district.id,
          clubId: club.id,
          name: input.name || existing.name,
          disabledAt: null,
        },
      })
    : await prismaService.user.create({
        data: {
          email,
          supabaseId: input.supabaseId,
          role: UserRole.district_admin,
          districtId: district.id,
          clubId: club.id,
          name: input.name || null,
        },
      });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "user.invite",
    targetType: "User",
    targetId: user.id,
    metadata: { email, role: "district_admin", districtId: district.id },
  });
  return ok({ id: user.id });
}

export async function disableDistrictAdmin(input: {
  actorUserId: string;
  userId: string;
}): Promise<ActionResult<{ id?: string }>> {
  const target = await prismaService.user.findUnique({ where: { id: input.userId } });
  if (!target || target.role !== UserRole.district_admin) {
    return fail("District admin not found");
  }
  await prismaService.user.update({
    where: { id: target.id },
    data: { disabledAt: new Date() },
  });
  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "user.disable",
    targetType: "User",
    targetId: target.id,
    metadata: { email: target.email },
  });
  return ok({ id: target.id });
}
