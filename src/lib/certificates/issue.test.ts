import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { evaluateVerification } from "@/lib/certificates/verify";
import { issueCertificate, revokeCertificate } from "@/lib/certificates/issue";
import { resetServerEnvCache } from "@/lib/env";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("issue + verify golden path (Rule 11)", () => {
  let prisma: PrismaClient;
  let pool: Pool;
  let clubAId = "";
  let clubBId = "";
  let eventAId = "";
  let adminAId = "";

  beforeAll(async () => {
    resetServerEnvCache();
    process.env.CERT_HMAC_SECRET =
      process.env.CERT_HMAC_SECRET ||
      "test-hmac-secret-at-least-32-characters-long";
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const district = await prisma.district.upsert({
      where: { code: "TESTDIST" },
      update: {},
      create: { code: "TESTDIST", name: "Test District" },
    });
    const clubA = await prisma.club.upsert({
      where: { code: "TSTA" },
      update: {},
      create: {
        code: "TSTA",
        name: "Club A",
        districtId: district.id,
      },
    });
    const clubB = await prisma.club.upsert({
      where: { code: "TSTB" },
      update: {},
      create: {
        code: "TSTB",
        name: "Club B",
        districtId: district.id,
      },
    });
    clubAId = clubA.id;
    clubBId = clubB.id;

    const admin = await prisma.user.upsert({
      where: { email: "admin-a@test.local" },
      update: { clubId: clubA.id },
      create: {
        email: "admin-a@test.local",
        supabaseId: "test-admin-a",
        role: UserRole.club_admin,
        clubId: clubA.id,
        districtId: district.id,
      },
    });
    adminAId = admin.id;

    const event = await prisma.event.create({
      data: { clubId: clubA.id, name: "Test Event" },
    });
    eventAId = event.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("issues a certificate retrievable by ID+token", async () => {
    const issued = await issueCertificate({
      eventId: eventAId,
      clubId: clubAId,
      actorUserId: adminAId,
      recipientName: "Test Person",
      recipientEmail: "person@test.local",
      role: "Volunteer",
      achievement: "Service",
    });

    const row = await prisma.certificate.findUniqueOrThrow({
      where: { uniqueId: issued.uniqueId },
      include: { event: { include: { club: true } } },
    });

    const result = evaluateVerification(
      {
        uniqueId: row.uniqueId,
        verificationToken: row.verificationToken,
        recipientName: row.recipientName,
        role: row.role,
        achievement: row.achievement,
        issueDate: row.issueDate,
        status: row.status,
        clubId: row.clubId,
        eventId: row.eventId,
        clubName: row.event.club.name,
        eventName: row.event.name,
      },
      issued.verificationToken,
    );

    expect(result.status).toBe("valid");
    if (result.status === "valid") {
      expect(result.recipientName).toBe("Test Person");
    }
  });

  it("shows revoked with no further detail", async () => {
    const issued = await issueCertificate({
      eventId: eventAId,
      clubId: clubAId,
      actorUserId: adminAId,
      recipientName: "Revokee",
      recipientEmail: "revokee@test.local",
      role: "Volunteer",
    });
    await revokeCertificate({
      certificateId: issued.id,
      clubId: clubAId,
      actorUserId: adminAId,
      reason: "Issued in error",
    });
    const row = await prisma.certificate.findUniqueOrThrow({
      where: { id: issued.id },
      include: { event: { include: { club: true } } },
    });
    const result = evaluateVerification(
      {
        uniqueId: row.uniqueId,
        verificationToken: row.verificationToken,
        recipientName: row.recipientName,
        role: row.role,
        achievement: row.achievement,
        issueDate: row.issueDate,
        status: row.status,
        clubId: row.clubId,
        eventId: row.eventId,
        clubName: row.event.club.name,
        eventName: row.event.name,
      },
      issued.verificationToken,
    );
    expect(result).toEqual({
      status: "revoked",
      uniqueId: issued.uniqueId,
      message: "This certificate has been revoked.",
    });
  });

  it("club A cannot read club B certificates via club-scoped query", async () => {
    const eventB = await prisma.event.create({
      data: { clubId: clubBId, name: "Club B Event" },
    });
    const adminB = await prisma.user.upsert({
      where: { email: "admin-b@test.local" },
      update: {},
      create: {
        email: "admin-b@test.local",
        supabaseId: "test-admin-b",
        role: UserRole.club_admin,
        clubId: clubBId,
      },
    });
    const issued = await issueCertificate({
      eventId: eventB.id,
      clubId: clubBId,
      actorUserId: adminB.id,
      recipientName: "Secret",
      role: "Member",
    });

    const leaked = await prisma.certificate.findFirst({
      where: { id: issued.id, clubId: clubAId },
    });
    expect(leaked).toBeNull();
  });
});
