import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { TEMPLATE_GALLERY, type GalleryPreset } from "@/lib/templates/gallery";

export type ClubBrandingCached = {
  id: string;
  name: string;
  code: string;
  publicSlug: string | null;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  tagline: string | null;
};

export function clubBrandingTag(clubId: string): string {
  return `club-branding:${clubId}`;
}

export function clubSlugTag(slug: string): string {
  return `club-slug:${slug}`;
}

export function galleryTag(): string {
  return "template-gallery";
}

/** Branding only — never cache verify decisions without cert:{uniqueId} invalidation on revoke. */
export function getCachedClubBrandingBySlug(slug: string) {
  return unstable_cache(
    async (): Promise<ClubBrandingCached | null> => {
      return prisma.club.findUnique({
        where: { publicSlug: slug },
        select: {
          id: true,
          name: true,
          code: true,
          publicSlug: true,
          logoUrl: true,
          primaryColor: true,
          accentColor: true,
          tagline: true,
        },
      });
    },
    [`club-branding-slug`, slug],
    {
      revalidate: 120,
      tags: [clubSlugTag(slug)],
    },
  )();
}

export function getCachedClubBrandingById(clubId: string) {
  return unstable_cache(
    async (): Promise<ClubBrandingCached | null> => {
      return prisma.club.findUnique({
        where: { id: clubId },
        select: {
          id: true,
          name: true,
          code: true,
          publicSlug: true,
          logoUrl: true,
          primaryColor: true,
          accentColor: true,
          tagline: true,
        },
      });
    },
    [`club-branding-id`, clubId],
    {
      revalidate: 120,
      tags: [clubBrandingTag(clubId)],
    },
  )();
}

export function getCachedGalleryPresets() {
  return unstable_cache(
    async (): Promise<GalleryPreset[]> => TEMPLATE_GALLERY,
    ["template-gallery-presets"],
    { revalidate: 300, tags: [galleryTag()] },
  )();
}

export function invalidateClubBranding(opts: {
  clubId: string;
  slug?: string | null;
  previousSlug?: string | null;
}): void {
  revalidateTag(clubBrandingTag(opts.clubId), "max");
  if (opts.slug) revalidateTag(clubSlugTag(opts.slug), "max");
  if (opts.previousSlug && opts.previousSlug !== opts.slug) {
    revalidateTag(clubSlugTag(opts.previousSlug), "max");
  }
}

export function invalidateGalleryCache(): void {
  revalidateTag(galleryTag(), "max");
}
