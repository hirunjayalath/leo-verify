import "dotenv/config";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const adminEmail =
    process.env.SEED_ADMIN_EMAIL ?? "admin@uom.leoverify.local";
  const adminSupabaseId =
    process.env.SEED_ADMIN_SUPABASE_ID ??
    "00000000-0000-4000-8000-000000000001";
  const adminName = process.env.SEED_ADMIN_NAME ?? "UOM Club Admin";

  const district = await prisma.district.upsert({
    where: { code: "306A2" },
    update: { name: "District 306 A2" },
    create: {
      code: "306A2",
      name: "District 306 A2",
    },
  });

  const club = await prisma.club.upsert({
    where: { code: "UOM" },
    update: {
      name: "Leo Club of University of Moratuwa",
      districtId: district.id,
    },
    create: {
      code: "UOM",
      name: "Leo Club of University of Moratuwa",
      districtId: district.id,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      supabaseId: adminSupabaseId,
      name: adminName,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: district.id,
    },
    create: {
      email: adminEmail,
      supabaseId: adminSupabaseId,
      name: adminName,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: district.id,
    },
  });

  console.log("Seeded:");
  console.log(`  District: ${district.name} (${district.code})`);
  console.log(`  Club:     ${club.name} (${club.code})`);
  console.log(`  Admin:    ${admin.email} · role=${admin.role}`);
  console.log(
    "Link SEED_ADMIN_SUPABASE_ID to the matching Supabase Auth user UUID.",
  );

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
