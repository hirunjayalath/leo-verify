import { afterAll, describe, expect, it } from "vitest";
import { CertificateStatus, PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getPlatformClubReport,
  type PlatformClubReportRow,
} from "@/lib/orgs/platform";

function ownerDatabaseUrl(): string | undefined {
  return process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
}

async function databaseReady(): Promise<boolean> {
  const connectionString = ownerDatabaseUrl();
  if (!connectionString) return false;
  const probe = new Pool({
    connectionString,
    connectionTimeoutMillis: 20_000,
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

if (process.env.CI && !dbReady) {
  throw new Error("Rule 11 tests require Postgres in CI");
}

describe("platform club report shape", () => {
  it("never includes recipient fields", () => {
    const row: PlatformClubReportRow = {
      clubId: "c1",
      name: "UOM",
      code: "UOM",
      events: 2,
      issued: 10,
      revoked: 1,
    };
    expect(Object.keys(row).sort()).toEqual(
      ["clubId", "code", "events", "issued", "name", "revoked"].sort(),
    );
  });
});

describe.skipIf(!dbReady)(
  "UOM report isolation",
  { timeout: 60_000 },
  () => {
    let prisma: PrismaClient;
    let pool: Pool;

    afterAll(async () => {
      await prisma?.$disconnect();
      await pool?.end();
    });

    it("returns counts only and never recipient name or email", async () => {
      pool = new Pool({ connectionString: ownerDatabaseUrl() });
      prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

      const secretEmail = `report-secret-${Date.now()}@hidden.example`;
      const secretName = `Hidden Recipient ${Date.now()}`;
      const club = await prisma.club.findFirst({
        select: { id: true, code: true },
      });
      const event = club
        ? await prisma.event.findFirst({
            where: { clubId: club.id },
            select: { id: true },
          })
        : null;
      if (club && event) {
        await prisma.certificate.create({
          data: {
            uniqueId: `LEO-${club.code}-2099-${String(Date.now()).slice(-6)}`,
            clubId: club.id,
            eventId: event.id,
            recipientName: secretName,
            recipientEmail: secretEmail,
            role: "Volunteer",
            issueDate: new Date(),
            status: CertificateStatus.issued,
          },
        });
      }

      const rows = await getPlatformClubReport();
      const serialized = JSON.stringify(rows);
      expect(serialized).not.toContain(secretEmail);
      expect(serialized).not.toContain(secretName);
      expect(serialized).not.toMatch(/recipient/i);
      for (const row of rows) {
        expect(Object.keys(row).sort()).toEqual(
          ["clubId", "code", "events", "issued", "name", "revoked"].sort(),
        );
        expect(typeof row.issued).toBe("number");
        expect(typeof row.revoked).toBe("number");
      }
    });
  },
);
