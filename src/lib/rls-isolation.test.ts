import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

function ownerUrl(): string | undefined {
  return process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
}

async function roleReady(): Promise<boolean> {
  const url = ownerUrl();
  if (!url) return false;
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 20_000,
  });
  try {
    const role = await pool.query(
      `SELECT 1 FROM pg_roles WHERE rolname = 'leoverify_app'`,
    );
    if (role.rowCount !== 1) return false;
    await pool.query("BEGIN");
    await pool.query("SET LOCAL ROLE leoverify_app");
    await pool.query("ROLLBACK");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => undefined);
  }
}

const ready = await roleReady();

if (process.env.CI && !ready) {
  throw new Error("Rule 11 tests require Postgres in CI");
}

describe.skipIf(!ready)(
  "RLS: club A cannot read club B as leoverify_app",
  { timeout: 60_000 },
  () => {
    let pool: Pool;

    afterAll(async () => {
      await pool?.end().catch(() => undefined);
    });

    it("returns no club B certificates when GUC is club A", async () => {
      pool = new Pool({ connectionString: ownerUrl() });
      const owner = pool;
      const district = await owner.query(
        `INSERT INTO "District" (id, name, code, "createdAt", "updatedAt")
         VALUES (concat('rlsd', substr(md5(random()::text), 1, 20)), 'RLS Dist', concat('RLS', substr(md5(random()::text), 1, 6)), now(), now())
         RETURNING id`,
      );
      const districtId = district.rows[0].id as string;
      const clubA = await owner.query(
        `INSERT INTO "Club" (id, "districtId", name, code, "createdAt", "updatedAt")
         VALUES (concat('rlsa', substr(md5(random()::text), 1, 20)), $1, 'Club A', concat('RA', substr(md5(random()::text), 1, 6)), now(), now())
         RETURNING id`,
        [districtId],
      );
      const clubB = await owner.query(
        `INSERT INTO "Club" (id, "districtId", name, code, "createdAt", "updatedAt")
         VALUES (concat('rlsb', substr(md5(random()::text), 1, 20)), $1, 'Club B', concat('RB', substr(md5(random()::text), 1, 6)), now(), now())
         RETURNING id`,
        [districtId],
      );
      const clubAId = clubA.rows[0].id as string;
      const clubBId = clubB.rows[0].id as string;
      const adminA = await owner.query(
        `INSERT INTO "User" (id, "supabaseId", email, role, "clubId", "districtId", "createdAt", "updatedAt")
         VALUES (concat('rlua', substr(md5(random()::text), 1, 20)), $1, $2, 'club_admin', $3, $4, now(), now())
         RETURNING id, "supabaseId"`,
        [
          `rls-a-${Date.now()}`,
          `rls-a-${Date.now()}@test.local`,
          clubAId,
          districtId,
        ],
      );
      const eventB = await owner.query(
        `INSERT INTO "Event" (id, "clubId", name, "createdAt", "updatedAt")
         VALUES (concat('rlse', substr(md5(random()::text), 1, 20)), $1, 'B Event', now(), now())
         RETURNING id`,
        [clubBId],
      );
      const uniqueId = `LEO-RLS-${Date.now()}-000001`;
      await owner.query(
        `INSERT INTO "Certificate" (id, "uniqueId", "clubId", "eventId", "recipientName", role, "issueDate", status, "tokenVersion", "createdAt", "updatedAt")
         VALUES (concat('rlsc', substr(md5(random()::text), 1, 20)), $1, $2, $3, 'Secret', 'Volunteer', now(), 'issued', 1, now(), now())`,
        [uniqueId, clubBId, eventB.rows[0].id],
      );
      const jobB = await owner.query(
        `INSERT INTO "ImportJob" (id, "clubId", "eventId", status, "createdAt", "updatedAt")
         VALUES (concat('rlsj', substr(md5(random()::text), 1, 20)), $1, $2, 'pending', now(), now())
         RETURNING id`,
        [clubBId, eventB.rows[0].id],
      );
      await owner.query(
        `INSERT INTO "ImportJobRow" (id, "jobId", "clubId", "rowNumber", "recipientName", role, status, "createdAt", "updatedAt")
         VALUES (concat('rlsr', substr(md5(random()::text), 1, 20)), $1, $2, 1, 'Secret Row', 'Volunteer', 'pending', now(), now())`,
        [jobB.rows[0].id, clubBId],
      );

      const client = await owner.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL ROLE leoverify_app");
        await client.query("SELECT set_config('app.current_supabase_id', $1, true)", [
          adminA.rows[0].supabaseId,
        ]);
        const leaked = await client.query(
          `SELECT "uniqueId" FROM "Certificate" WHERE "clubId" = $1`,
          [clubBId],
        );
        const leakedRows = await client.query(
          `SELECT id FROM "ImportJobRow" WHERE "clubId" = $1`,
          [clubBId],
        );
        await client.query("ROLLBACK");
        expect(leaked.rowCount).toBe(0);
        expect(leakedRows.rowCount).toBe(0);
      } finally {
        client.release();
      }
    });
  },
);
