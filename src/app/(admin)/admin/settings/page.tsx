import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClubBrandingForm } from "@/components/public/club-branding-form";
import { requireClubAdmin, withSessionRls } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminSettingsPage() {
  const user = await requireClubAdmin();
  const club = await withSessionRls(user, () =>
    prisma.club.findUniqueOrThrow({
      where: { id: user.clubId! },
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          White-label your organization portal, emails, and verify chrome.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            {club.publicSlug ? (
              <>
                Public portal:{" "}
                <Link
                  href={`/o/${club.publicSlug}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  /o/{club.publicSlug}
                </Link>
              </>
            ) : (
              "Set a public slug to publish your org portal."
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
