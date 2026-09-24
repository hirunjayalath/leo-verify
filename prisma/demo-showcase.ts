import "dotenv/config";
import {
  PrismaClient,
  TemplateStatus,
  UserRole,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { issueCertificate } from "../src/lib/certificates/issue";
import { deleteCertificatePdfObject } from "../src/lib/certificates/issue-pdf";
import { buildVerificationPath } from "../src/lib/certificates/token";
import { galleryById } from "../src/lib/templates/gallery";

const DEMO_EVENTS = [
  {
    name: "Annual Service Day 2026",
    galleryId: "appreciation",
    templateName: "Service appreciation",
  },
  {
    name: "Leadership Workshop",
    galleryId: "completion",
    templateName: "Workshop completion",
  },
] as const;

const DEMO_ROSTER = [
  {
    eventName: "Annual Service Day 2026",
    recipientName: "Nimal Perera",
    recipientEmail: "nimal.perera.demo@leoverify.local",
    role: "Volunteer",
    achievement: "Community service",
    qa: true,
  },
  {
    eventName: "Annual Service Day 2026",
    recipientName: "S. Fernando",
    recipientEmail: "s.fernando.demo@leoverify.local",
    role: "Organizer",
    achievement: null,
    qa: false,
  },
  {
    eventName: "Leadership Workshop",
    recipientName: "A. Jayasuriya",
    recipientEmail: "a.jayasuriya.demo@leoverify.local",
    role: "Participant",
    achievement: null,
    qa: false,
  },
] as const;

async function main() {
  const connectionString = process.env.DIRECT_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DIRECT_DATABASE_URL is required for db:demo");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const club = await prisma.club.findUnique({ where: { code: "UOM" } });
  if (!club) {
    throw new Error("UOM club not found. Run npm run db:seed first.");
  }

  const admin = await prisma.user.findFirst({
    where: { clubId: club.id, role: UserRole.club_admin },
    orderBy: { createdAt: "asc" },
  });
  if (!admin?.supabaseId) {
    throw new Error("UOM club admin with supabaseId is required");
  }

  const stale = await prisma.certificate.findMany({
    where: { clubId: club.id },
    select: { pdfKey: true },
  });
  for (const row of stale) {
    await deleteCertificatePdfObject(row.pdfKey);
  }

  await prisma.importJob.deleteMany({ where: { clubId: club.id } });
  await prisma.certificate.deleteMany({ where: { clubId: club.id } });
  await prisma.certificateTemplate.deleteMany({ where: { clubId: club.id } });
  await prisma.event.deleteMany({ where: { clubId: club.id } });

  const events = new Map<string, { id: string }>();
  for (const spec of DEMO_EVENTS) {
    const preset = galleryById(spec.galleryId);
    if (!preset) throw new Error(`Gallery preset missing: ${spec.galleryId}`);

    const event = await prisma.event.create({
      data: { clubId: club.id, name: spec.name },
    });
    events.set(spec.name, event);

    await prisma.certificateTemplate.create({
      data: {
        eventId: event.id,
        clubId: club.id,
        name: spec.templateName,
        backgroundUrl: preset.backgroundPath,
        layout: preset.layout,
        pageSize: "a4_landscape",
        status: TemplateStatus.approved,
        createdById: admin.id,
        lastEditedById: admin.id,
      },
    });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  console.log("UOM demo showcase");
  console.log(`  Club: ${club.name} (${club.id})`);
  console.log(`  Actor: ${admin.email}`);

  for (const row of DEMO_ROSTER) {
    const event = events.get(row.eventName);
    if (!event) throw new Error(`Event not created: ${row.eventName}`);

    const issued = await issueCertificate({
      eventId: event.id,
      clubId: club.id,
      actorUserId: admin.id,
      actorSupabaseId: admin.supabaseId,
      recipientName: row.recipientName,
      recipientEmail: row.recipientEmail,
      role: row.role,
      achievement: row.achievement,
      sendEmail: false,
    });

    const path = buildVerificationPath(issued.uniqueId, issued.verificationToken);
    const label = row.qa ? "QA" : "demo";
    console.log(
      `  [${label}] ${row.recipientName} · ${issued.uniqueId}${issued.skipped ? " (skipped)" : ""}`,
    );
    console.log(`         ${appUrl}${path}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
