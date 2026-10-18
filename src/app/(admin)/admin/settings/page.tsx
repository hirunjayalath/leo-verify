import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClubBrandingForm } from "@/components/public/club-branding-form";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireClubAdmin, withSessionRls } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminSettingsPage() {
  const user = await requireClubAdmin();
  const club = await withSessionRls(user, () =>
    prisma.club.findUniqueOrThrow({
      where: { id: user.clubId },
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-10 animate-fade-up">
      <AdminPageHeader
        eyebrow="Club workspace"
        title="Settings"
        description="Shape the club identity shown on public pages, emails, and certificate checks."
      />

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            {club.publicSlug ? (
              <>
                Club page:{" "}
                <Link
                  href={`/o/${club.publicSlug}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  /o/{club.publicSlug}
                </Link>
              </>
            ) : (
              "Set a public slug to publish your club page."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClubBrandingForm
            initial={{
              name: club.name,
              publicSlug: club.publicSlug,
              logoUrl: club.logoUrl,
              primaryColor: club.primaryColor,
              accentColor: club.accentColor,
              tagline: club.tagline,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
