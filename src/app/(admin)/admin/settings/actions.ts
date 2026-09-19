"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireClubAdmin } from "@/lib/auth";
import { sniffImageBytes } from "@/lib/certificates/image-sniff";
import {
  isHexColor,
  normalizeHexColor,
  slugifyPublic,
} from "@/lib/branding";
import { prisma } from "@/lib/db";
import { buildObjectKey, uploadObject } from "@/lib/storage/r2";

export type BrandingActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateClubBrandingAction(
  formData: FormData,
): Promise<BrandingActionResult> {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const taglineRaw = String(formData.get("tagline") || "").trim();
  const slugRaw = String(formData.get("publicSlug") || "").trim();
  const primaryRaw = String(formData.get("primaryColor") || "#323232");
  const accentRaw = String(formData.get("accentColor") || "#38a3e3");

  const slugParsed = z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .safeParse(slugifyPublic(slugRaw || user.club?.name || "org"));

  if (!slugParsed.success) {
    return {
      ok: false,
      error: "Slug must be 2–48 characters (lowercase letters, numbers, hyphens).",
    };
  }

  if (!isHexColor(primaryRaw) || !isHexColor(accentRaw)) {
    return { ok: false, error: "Colors must be valid hex values (#RGB or #RRGGBB)." };
  }

  const taken = await prisma.club.findFirst({
    where: {
      publicSlug: slugParsed.data,
      NOT: { id: clubId },
    },
    select: { id: true },
  });
  if (taken) return { ok: false, error: "That public slug is already taken." };

  let logoUrl: string | undefined;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: "Logo must be 2 MB or smaller." };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageBytes(bytes);
    if (!sniffed.ok) return { ok: false, error: sniffed.error };
    const key = buildObjectKey("logos", clubId, sniffed.ext);
    const uploaded = await uploadObject({
      key,
      body: bytes,
      contentType: sniffed.contentType,
    });
    logoUrl = uploaded.url;
  }

  await prisma.club.update({
    where: { id: clubId },
    data: {
      publicSlug: slugParsed.data,
      primaryColor: normalizeHexColor(primaryRaw, "#323232"),
      accentColor: normalizeHexColor(accentRaw, "#38a3e3"),
      tagline: taglineRaw ? taglineRaw.slice(0, 160) : null,
      ...(logoUrl ? { logoUrl } : {}),
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "club.branding.update",
    targetType: "Club",
    targetId: clubId,
    clubId,
    metadata: { slug: slugParsed.data },
  });

  revalidatePath("/admin/settings");
  revalidatePath(`/o/${slugParsed.data}`);
  revalidatePath("/admin");
  return { ok: true };
}
