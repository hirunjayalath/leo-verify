import {
  ClubType,
  PlanTier,
  TemplateStatus,
  UserRole,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { sniffImageBytes } from "@/lib/certificates/image-sniff";
import {
  isHexColor,
  normalizeHexColor,
  slugifyPublic,
} from "@/lib/branding";
import { invalidateClubBranding } from "@/lib/cache/safe-cache";
import {
  assertNotInRlsContext,
  prisma,
  prismaService,
  withRlsContext,
} from "@/lib/db";
import { buildObjectKey, uploadObject } from "@/lib/storage/r2";

export type OrgServiceResult =
  | { ok: true; id?: string; slug?: string; previousSlug?: string | null }
  | { ok: false; error: string };

export async function createClub(input: {
  districtId: string;
  actorUserId: string;
  name: string;
  code: string;
}): Promise<OrgServiceResult> {
  const club = await prisma.club.create({
    data: {
      name: input.name,
      code: input.code.toUpperCase(),
      districtId: input.districtId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "club.create",
    targetType: "Club",
    targetId: club.id,
    metadata: { code: club.code },
  });

  return { ok: true, id: club.id };
}

export async function inviteClubAdmin(input: {
  districtId: string;
  actorUserId: string;
  clubId: string;
  email: string;
  name?: string;
  supabaseId: string;
}): Promise<OrgServiceResult> {
  const club = await prisma.club.findFirst({
    where: { id: input.clubId, districtId: input.districtId },
  });
  if (!club) return { ok: false, error: "Club not found in your district" };

  const email = input.email.toLowerCase();
  const supabaseId = input.supabaseId.trim();

  const bySupabase = await prisma.user.findUnique({ where: { supabaseId } });
  if (bySupabase && bySupabase.email.toLowerCase() !== email) {
    return {
      ok: false,
      error: "That Auth user id is already linked to a different user.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === UserRole.district_admin) {
      return {
        ok: false,
        error: "Cannot reassign a district admin this way.",
      };
    }
    if (existing.districtId && existing.districtId !== input.districtId) {
      return {
        ok: false,
        error: "That user belongs to another district.",
      };
    }
    if (existing.supabaseId && existing.supabaseId !== supabaseId) {
      return {
        ok: false,
        error: "That email is already linked to a different Auth account.",
      };
    }

    const invited = await prisma.user.update({
      where: { id: existing.id },
      data: {
        supabaseId,
        role: UserRole.club_admin,
        clubId: club.id,
        districtId: input.districtId,
        name: input.name || existing.name,
      },
    });

    await writeAuditLog({
      actorUserId: input.actorUserId,
      action: "user.invite",
      targetType: "User",
      targetId: invited.id,
      clubId: club.id,
      metadata: { email: invited.email, mode: "update" },
    });

    return { ok: true, id: invited.id };
  }

  const invited = await prisma.user.create({
    data: {
      email,
      supabaseId,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: input.districtId,
      name: input.name || null,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "user.invite",
    targetType: "User",
    targetId: invited.id,
    clubId: club.id,
    metadata: { email: invited.email, mode: "create" },
  });

  return { ok: true, id: invited.id };
}

export async function reviewTemplate(input: {
  districtId: string;
  actorUserId: string;
  templateId: string;
  decision: "approved" | "rejected";
  note: string;
}): Promise<OrgServiceResult> {
  const template = await prisma.certificateTemplate.findFirst({
    where: {
      id: input.templateId,
      club: { districtId: input.districtId },
    },
  });
  if (!template) return { ok: false, error: "Template not found" };

  await prisma.certificateTemplate.update({
    where: { id: input.templateId },
    data: {
      status:
        input.decision === "approved"
          ? TemplateStatus.approved
          : TemplateStatus.rejected,
      reviewNote: input.note || null,
      lastEditedById: input.actorUserId,
    },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action:
      input.decision === "approved" ? "template.approve" : "template.reject",
    targetType: "CertificateTemplate",
    targetId: input.templateId,
    clubId: template.clubId,
    metadata: { note: input.note },
  });

  return { ok: true, id: input.templateId };
}

export async function updateClubBranding(input: {
  clubId: string;
  actorUserId: string;
  actorSupabaseId: string;
  orgNameFallback: string;
  tagline: string;
  publicSlug: string;
  primaryColor: string;
  accentColor: string;
  logo?: File | null;
}): Promise<OrgServiceResult> {
  assertNotInRlsContext("updateClubBranding");
  const slug = slugifyPublic(input.publicSlug || input.orgNameFallback);
  if (slug.length < 2 || slug.length > 48 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return {
      ok: false,
      error: "Slug must be 2–48 characters (lowercase letters, numbers, hyphens).",
    };
  }

  if (!isHexColor(input.primaryColor) || !isHexColor(input.accentColor)) {
    return { ok: false, error: "Colors must be valid hex values (#RGB or #RRGGBB)." };
  }

  const taken = await withRlsContext(input.actorSupabaseId, (tx) =>
    tx.club.findFirst({
      where: {
        publicSlug: slug,
        NOT: { id: input.clubId },
      },
      select: { id: true },
    }),
  );
  if (taken) return { ok: false, error: "That public slug is already taken." };

  let logoUrl: string | undefined;
  if (input.logo instanceof File && input.logo.size > 0) {
    if (input.logo.size > 2 * 1024 * 1024) {
      return { ok: false, error: "Logo must be 2 MB or smaller." };
    }
    const bytes = Buffer.from(await input.logo.arrayBuffer());
    const sniffed = sniffImageBytes(bytes);
    if (!sniffed.ok) return { ok: false, error: sniffed.error };
    const key = buildObjectKey("logos", input.clubId, sniffed.ext);
    const uploaded = await uploadObject({
      key,
      body: bytes,
      contentType: sniffed.contentType,
    });
    logoUrl = uploaded.url;
  }

  const previous = await withRlsContext(input.actorSupabaseId, async (tx) => {
    const current = await tx.club.findUnique({
      where: { id: input.clubId },
      select: { publicSlug: true, name: true },
    });

    await tx.club.update({
      where: { id: input.clubId },
      data: {
        publicSlug: slug,
        primaryColor: normalizeHexColor(input.primaryColor, "#323232"),
        accentColor: normalizeHexColor(input.accentColor, "#38a3e3"),
        tagline: input.tagline ? input.tagline.slice(0, 160) : null,
        ...(logoUrl ? { logoUrl } : {}),
      },
    });

    await writeAuditLog({
      actorUserId: input.actorUserId,
      action: "club.branding.update",
      targetType: "Club",
      targetId: input.clubId,
      clubId: input.clubId,
      metadata: { slug, name: current?.name ?? input.orgNameFallback },
      client: tx,
    });

    return current;
  });

  invalidateClubBranding({
    clubId: input.clubId,
    slug,
    previousSlug: previous?.publicSlug,
  });

  return { ok: true, slug, previousSlug: previous?.publicSlug };
}

export type SignupOrgResult =
  | { ok: true; clubId: string }
  | { ok: false; error: string };

/** Creates a public org bound to an authenticated Supabase identity. */
export async function signupPublicOrg(input: {
  supabaseId: string;
  adminEmail: string;
  orgName: string;
  orgCode: string;
  adminName: string;
}): Promise<SignupOrgResult> {
  const adminEmail = input.adminEmail.toLowerCase();

  const existingByEmail = await prismaService.user.findUnique({
    where: { email: adminEmail },
  });
  if (existingByEmail) {
    return {
      ok: false,
      error:
        "An account with this email already exists. Contact support if this is unexpected.",
    };
  }

  const existingBySupabase = await prismaService.user.findUnique({
    where: { supabaseId: input.supabaseId },
  });
  if (existingBySupabase) {
    return {
      ok: false,
      error: "This account is already linked to an organization.",
    };
  }

  const district = await prismaService.district.upsert({
    where: { code: "PUBLIC" },
    update: {},
    create: { code: "PUBLIC", name: "Public organizations" },
  });

  const existing = await prismaService.club.findUnique({
    where: { code: input.orgCode.toUpperCase() },
  });
  if (existing) return { ok: false, error: "Organization code already taken" };

  const baseSlug =
    slugifyPublic(input.orgName) || slugifyPublic(input.orgCode);
  let publicSlug = baseSlug;
  let n = 1;
  while (await prismaService.club.findUnique({ where: { publicSlug } })) {
    publicSlug = `${baseSlug}-${n++}`.slice(0, 48);
  }

  const club = await prismaService.club.create({
    data: {
      name: input.orgName,
      code: input.orgCode.toUpperCase(),
      districtId: district.id,
      type: ClubType.public,
      // PlanTier retained for schema compat; monthlyCertLimit is the real quota.
      plan: PlanTier.free,
      monthlyCertLimit: 100,
      publicSlug,
      primaryColor: "#323232",
      accentColor: "#38a3e3",
    },
  });

  await prismaService.user.create({
    data: {
      email: adminEmail,
      supabaseId: input.supabaseId,
      name: input.adminName,
      role: UserRole.club_admin,
      clubId: club.id,
      districtId: district.id,
    },
  });

  await writeAuditLog({
    action: "club.create",
    targetType: "Club",
    targetId: club.id,
    clubId: club.id,
    metadata: { type: "public", monthlyCertLimit: 100 },
    client: prismaService,
  });

  return { ok: true, clubId: club.id };
}
