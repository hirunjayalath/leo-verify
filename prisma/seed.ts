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

  const districtAdminEmail = process.env.SEED_DISTRICT_ADMIN_EMAIL;
  const districtAdminSupabaseId = process.env.SEED_DISTRICT_ADMIN_SUPABASE_ID;
  const districtAdminName =
    process.env.SEED_DISTRICT_ADMIN_NAME ?? "District Admin";
  const promoteUomAsDistrict =
    process.env.SEED_PROMOTE_UOM_DISTRICT_ADMIN === "true";

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

  const clubAdminRole = promoteUomAsDistrict
    ? UserRole.district_admin
    : UserRole.club_admin;

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      supabaseId: adminSupabaseId,
      name: adminName,
      role: clubAdminRole,
      clubId: club.id,
      districtId: district.id,
    },
    create: {
      email: adminEmail,
      supabaseId: adminSupabaseId,
      name: adminName,
      role: clubAdminRole,
      clubId: club.id,
      districtId: district.id,
    },
  });

  console.log("Seeded:");
  console.log(`  District: ${district.name} (${district.code})`);
  console.log(`  Club:     ${club.name} (${club.code})`);
  console.log(`  Admin:    ${admin.email} · role=${admin.role}`);

  if (districtAdminEmail && districtAdminSupabaseId) {
    const districtAdmin = await prisma.user.upsert({
      where: { email: districtAdminEmail },
      update: {
        supabaseId: districtAdminSupabaseId,
        name: districtAdminName,
        role: UserRole.district_admin,
        clubId: null,
        districtId: district.id,
      },
      create: {
        email: districtAdminEmail,
        supabaseId: districtAdminSupabaseId,
        name: districtAdminName,
        role: UserRole.district_admin,
        clubId: null,
        districtId: district.id,
      },
    });
    console.log(
      `  District admin: ${districtAdmin.email} · role=${districtAdmin.role} (no clubId)`,
    );
  } else if (promoteUomAsDistrict) {
    console.log(
      "  UOM admin promoted to district_admin (SEED_PROMOTE_UOM_DISTRICT_ADMIN).",
    );
  } else {
    console.log(
      "  Tip: set SEED_DISTRICT_ADMIN_EMAIL + SEED_DISTRICT_ADMIN_SUPABASE_ID",
    );
    console.log(
      "       or SEED_PROMOTE_UOM_DISTRICT_ADMIN=true for district onboarding.",
    );
  }

  console.log(
    "Link SEED_ADMIN_SUPABASE_ID to the matching Supabase Auth user UUID.",
  );
  console.log(
    "Launch gate: apply supabase/rls-policies.sql after migrate on Supabase.",
  );

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
