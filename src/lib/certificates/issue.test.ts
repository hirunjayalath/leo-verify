import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaClient,
  TemplateStatus,
  UserRole,
} from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { evaluateVerification } from "@/lib/certificates/verify";
import {
  issueCertificate,
  reissueCertificate,
  revokeCertificate,
} from "@/lib/certificates/issue";
import { verifyVerificationToken } from "@/lib/certificates/token";
import { DEFAULT_LAYOUT } from "@/lib/certificates/layout";
import { resetServerEnvCache } from "@/lib/env";

async function databaseReady(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const probe = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2500,
  });
  try {
    await probe.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await probe.end().catch(() => undefined);
  }
}

const dbReady = await databaseReady();

describe.skipIf(!dbReady)("issue + verify golden path (Rule 11)", () => {
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

    await prisma.certificateTemplate.create({
      data: {
        eventId: event.id,
        clubId: clubA.id,
        name: "Approved Template A",
        backgroundUrl: "https://example.com/bg.png",
        layout: DEFAULT_LAYOUT,
        status: TemplateStatus.approved,
        createdById: admin.id,
        lastEditedById: admin.id,
      },
    });
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
      sendEmail: false,
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
        pdfUrl: row.pdfUrl,
        tokenVersion: row.tokenVersion,
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
      sendEmail: false,
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
        pdfUrl: row.pdfUrl,
        tokenVersion: row.tokenVersion,
      },
      issued.verificationToken,
    );
    expect(result).toEqual({
      status: "revoked",
      uniqueId: issued.uniqueId,
      message: "This certificate has been revoked.",
    });
  });

  it("skips duplicate issue without email (same event + name)", async () => {
    const first = await issueCertificate({
      eventId: eventAId,
      clubId: clubAId,
      actorUserId: adminAId,
      recipientName: "No Email Twin",
      recipientEmail: null,
      role: "Volunteer",
      sendEmail: false,
    });
    const second = await issueCertificate({
      eventId: eventAId,
      clubId: clubAId,
      actorUserId: adminAId,
      recipientName: "No Email Twin",
      recipientEmail: null,
      role: "Volunteer",
      sendEmail: false,
    });
    expect(second.skipped).toBe(true);
    expect(second.uniqueId).toBe(first.uniqueId);
  });

  it("auto-links recipientId when a claimed recipient matches email", async () => {
    const email = `autolink-${Date.now()}@test.local`;
    const recipient = await prisma.recipient.create({
      data: {
        email,
        name: "Linked Person",
        slug: `linked-${Date.now()}`,
      },
    });
    const issued = await issueCertificate({
      eventId: eventAId,
      clubId: clubAId,
      actorUserId: adminAId,
      recipientName: "Linked Person",
      recipientEmail: email,
      role: "Volunteer",
      sendEmail: false,
    });
    const row = await prisma.certificate.findUniqueOrThrow({
      where: { id: issued.id },
    });
    expect(row.recipientId).toBe(recipient.id);
  });

  it("reissue rotates verification token so old links fail", async () => {
    const issued = await issueCertificate({
      eventId: eventAId,
      clubId: clubAId,
      actorUserId: adminAId,
      recipientName: "Reissue Target",
      recipientEmail: `reissue-${Date.now()}@test.local`,
      role: "Volunteer",
      sendEmail: false,
    });
    const oldToken = issued.verificationToken;
    const reissued = await reissueCertificate({
      certificateId: issued.id,
      clubId: clubAId,
      actorUserId: adminAId,
    });
    expect(reissued.verificationToken).not.toBe(oldToken);

    const row = await prisma.certificate.findUniqueOrThrow({
      where: { id: issued.id },
      include: { event: { include: { club: true } } },
    });
    const fields = {
      uniqueId: row.uniqueId,
      recipientName: row.recipientName,
      eventId: row.eventId,
      clubId: row.clubId,
      issueDate: row.issueDate.toISOString().slice(0, 10),
      role: row.role,
      tokenVersion: row.tokenVersion,
    };
    expect(verifyVerificationToken(fields, oldToken)).toBe(false);
    expect(verifyVerificationToken(fields, reissued.verificationToken)).toBe(
      true,
    );
    expect(row.tokenVersion).toBeGreaterThan(1);
  });

  it("rejects issuance when only a draft template exists", async () => {
    const draftEvent = await prisma.event.create({
      data: { clubId: clubAId, name: "Draft-only Event" },
    });
    await prisma.certificateTemplate.create({
      data: {
        eventId: draftEvent.id,
        clubId: clubAId,
        name: "Draft Template",
        backgroundUrl: "https://example.com/bg.png",
        layout: DEFAULT_LAYOUT,
        status: TemplateStatus.draft,
        createdById: adminAId,
        lastEditedById: adminAId,
      },
    });

    await expect(
      issueCertificate({
        eventId: draftEvent.id,
        clubId: clubAId,
        actorUserId: adminAId,
        recipientName: "Blocked",
        role: "Volunteer",
        sendEmail: false,
      }),
    ).rejects.toThrow(/approved template/i);
  });

  it("club A cannot revoke club B certificates", async () => {
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
    await prisma.certificateTemplate.create({
      data: {
        eventId: eventB.id,
        clubId: clubBId,
        name: "Approved Template B",
        backgroundUrl: "https://example.com/bg.png",
        layout: DEFAULT_LAYOUT,
        status: TemplateStatus.approved,
        createdById: adminB.id,
        lastEditedById: adminB.id,
      },
    });
    const issued = await issueCertificate({
      eventId: eventB.id,
      clubId: clubBId,
      actorUserId: adminB.id,
      recipientName: "Secret",
      role: "Member",
      sendEmail: false,
    });

    const leaked = await prisma.certificate.findFirst({
      where: { id: issued.id, clubId: clubAId },
    });
    expect(leaked).toBeNull();

    await expect(
      revokeCertificate({
        certificateId: issued.id,
        clubId: clubAId,
        actorUserId: adminAId,
        reason: "Cross-tenant attempt",
      }),
    ).rejects.toThrow(/not found/i);
  });
});
