import {
  TemplateStatus,
  UserRole,
} from "@/generated/prisma/client";
import { type ActionResult, fail, ok } from "@/lib/action-result";
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

type OrgResult = ActionResult<{
  id?: string;
  slug?: string;
  previousSlug?: string | null;
  clubName?: string;
}>;

export async function createClub(input: {
  districtId: string;
  actorUserId: string;
  name: string;
  code: string;
}): Promise<OrgResult> {
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

export async function switchActingClub(input: {
  districtId: string;
  actorUserId: string;
  clubId: string | null;
}): Promise<OrgResult> {
  const actor = await prisma.user.findUnique({
    where: { id: input.actorUserId },
    select: { id: true, role: true, districtId: true, clubId: true },
  });
  if (
    !actor ||
    actor.role !== UserRole.district_admin ||
    actor.districtId !== input.districtId
  ) {
    return fail("Only district admins can switch clubs.");
  }

  let nextClubId: string | null = input.clubId;
  if (!nextClubId) {
    nextClubId = null;
  } else {
    const club = await prisma.club.findFirst({
      where: { id: nextClubId, districtId: input.districtId },
      select: { id: true },
    });
    if (!club) return fail("Club not found in your district");
  }

  const previousClubId = actor.clubId;
  if (previousClubId === nextClubId) {
    return ok({ id: nextClubId ?? undefined });
  }

  await prisma.user.update({
    where: { id: actor.id },
    data: { clubId: nextClubId },
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "club.switch",
    targetType: "Club",
    targetId: nextClubId ?? input.districtId,
    clubId: nextClubId,
    metadata: { previousClubId, clubId: nextClubId },
  });

  return ok({ id: nextClubId ?? undefined });
}

export async function inviteClubAdmin(input: {
  districtId: string;
  actorUserId: string;
  clubId: string;
  email: string;
  name?: string;
  supabaseId: string;
}): Promise<OrgResult> {
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

    return { ok: true, id: invited.id, clubName: club.name };
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

  return { ok: true, id: invited.id, clubName: club.name };
}

export async function reviewTemplate(input: {
  districtId: string;
  actorUserId: string;
  templateId: string;
  decision: "approved" | "rejected";
  note: string;
}): Promise<OrgResult> {
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
}): Promise<OrgResult> {
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

/** Creates a public org bound to an authenticated Supabase identity. */
export async function signupPublicOrg(input: {
  supabaseId: string;
  adminEmail: string;
  orgName: string;
  orgCode: string;
  adminName: string;
}): Promise<ActionResult<{ clubId: string }>> {
  const rows = await prismaService.$queryRaw<
    Array<{ club_id: string | null; error: string | null }>
  >`
    SELECT club_id, error
    FROM public.signup_public_org(
      ${input.supabaseId},
      ${input.adminEmail},
      ${input.orgName},
      ${input.orgCode},
      ${input.adminName}
    )
  `;
  const row = rows[0];
  if (row?.error) return fail(row.error);
  if (!row?.club_id) return fail("Could not create organization.");
  return ok({ clubId: row.club_id });
}
