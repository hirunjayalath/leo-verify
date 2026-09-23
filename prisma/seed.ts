import "dotenv/config";
import { PrismaClient, PlanTier, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { issueCertificate } from "../src/lib/certificates/issue";
import { ensureAuthUser } from "../src/lib/supabase/admin";

async function linkAuthUser(input: {
  email: string | undefined;
  password: string | undefined;
  fallbackId?: string;
  label: string;
}): Promise<string | undefined> {
  if (!input.email) return input.fallbackId;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`  Skip Auth for ${input.label}: SUPABASE_SERVICE_ROLE_KEY unset`);
    return input.fallbackId;
  }
  if (!input.password) {
    console.log(`  Skip Auth for ${input.label}: password unset`);
    return input.fallbackId;
  }
  const user = await ensureAuthUser({
    email: input.email,
    password: input.password,
  });
  console.log(`  Auth ${input.label}: ${user.email} · ${user.id}`);
  return user.id;
}

async function main() {
  const connectionString = process.env.DIRECT_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_DATABASE_URL is required to seed");
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

  const clubAdminLoginEmail = process.env.SEED_CLUB_ADMIN_LOGIN_EMAIL;
  const recipientEmail = process.env.SEED_RECIPIENT_EMAIL;

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
      monthlyCertLimit: 10_000,
      plan: PlanTier.club,
    },
    create: {
      code: "UOM",
      name: "Leo Club of University of Moratuwa",
      districtId: district.id,
      monthlyCertLimit: 10_000,
      plan: PlanTier.club,
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

  if (clubAdminLoginEmail && clubAdminLoginEmail !== adminEmail) {
    const loginId = await linkAuthUser({
      email: clubAdminLoginEmail,
      password: process.env.SEED_CLUB_ADMIN_PASSWORD,
      label: "club admin login",
    });
    if (loginId) {
      const loginAdmin = await prisma.user.upsert({
        where: { email: clubAdminLoginEmail },
        update: {
          supabaseId: loginId,
          name: adminName,
          role: UserRole.club_admin,
          clubId: club.id,
          districtId: district.id,
        },
        create: {
          email: clubAdminLoginEmail,
          supabaseId: loginId,
          name: adminName,
          role: UserRole.club_admin,
          clubId: club.id,
          districtId: district.id,
        },
      });
      console.log(
        `  Club admin login: ${loginAdmin.email} · role=${loginAdmin.role}`,
      );
    }
  }

  const resolvedDistrictAuthId = await linkAuthUser({
    email: districtAdminEmail,
    password: process.env.SEED_DISTRICT_ADMIN_PASSWORD,
    fallbackId: districtAdminSupabaseId,
    label: "district admin",
  });

  if (districtAdminEmail && resolvedDistrictAuthId) {
    const districtAdmin = await prisma.user.upsert({
      where: { email: districtAdminEmail },
      update: {
        supabaseId: resolvedDistrictAuthId,
        name: districtAdminName,
        role: UserRole.district_admin,
        clubId: null,
        districtId: district.id,
      },
      create: {
        email: districtAdminEmail,
        supabaseId: resolvedDistrictAuthId,
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
      "  Tip: set SEED_DISTRICT_ADMIN_EMAIL + SEED_DISTRICT_ADMIN_PASSWORD",
    );
    console.log(
      "       (service role creates/links Auth; do not promote the UOM club admin).",
    );
  }

  if (recipientEmail) {
    await linkAuthUser({
      email: recipientEmail,
      password: process.env.SEED_RECIPIENT_PASSWORD,
      label: "recipient",
    });

    const template = await prisma.certificateTemplate.findFirst({
      where: { clubId: club.id, status: "approved" },
      orderBy: { updatedAt: "desc" },
      select: { eventId: true, event: { select: { name: true } } },
    });
    if (!template) {
      console.log("  Skip recipient certificate: no approved UOM template");
    } else {
      const issued = await issueCertificate({
        eventId: template.eventId,
        clubId: club.id,
        actorUserId: admin.id,
        actorSupabaseId: admin.supabaseId,
        recipientName: "QA2 Recipient",
        recipientEmail,
        role: "Participant",
        achievement: "QA2 claim seed",
        sendEmail: false,
      });
      console.log(
        `  Recipient cert: ${issued.uniqueId}${issued.skipped ? " (skipped)" : ""} · ${template.event.name}`,
      );
    }
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
