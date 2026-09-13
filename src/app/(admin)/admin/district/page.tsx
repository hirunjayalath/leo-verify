import {
  CreateClubForm,
  InviteAdminForm,
  ReviewTemplateButtons,
} from "@/components/district-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CertificateStatus, TemplateStatus } from "@/generated/prisma/client";
import { requireDistrictAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DistrictAdminPage() {
  const user = await requireDistrictAdmin();
  const districtId = user.districtId!;

  const clubs = await prisma.club.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { events: true, users: true } },
    },
  });
  const clubIds = clubs.map((c) => c.id);

  const [issued, revoked, events, pendingTemplates] = await Promise.all([
    prisma.certificate.count({
      where: { clubId: { in: clubIds }, status: CertificateStatus.issued },
    }),
    prisma.certificate.count({
      where: { clubId: { in: clubIds }, status: CertificateStatus.revoked },
    }),
    prisma.event.count({ where: { clubId: { in: clubIds } } }),
    prisma.certificateTemplate.findMany({
      where: {
        clubId: { in: clubIds },
        status: TemplateStatus.draft,
      },
      include: {
        event: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const perClub = await Promise.all(
    clubs.map(async (club) => ({
      club,
      issued: await prisma.certificate.count({
        where: { clubId: club.id, status: CertificateStatus.issued },
      }),
    })),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          District overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user.district?.name ?? "Your district"} — onboard clubs, approve
          templates, and review analytics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Clubs", value: clubs.length },
          { label: "Events", value: events },
          { label: "Certificates issued", value: issued },
          { label: "Revocations", value: revoked },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clubs</CardTitle>
            <CardDescription>Issued certificates by club</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {perClub.map(({ club, issued: count }) => (
                <li
                  key={club.id}
                  className="flex items-center justify-between py-3"
                >
                  <span>
                    {club.name}{" "}
                    <span className="text-muted-foreground">({club.code})</span>
                  </span>
                  <span className="font-medium">{count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Templates awaiting approval</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts pending.</p>
            ) : (
              <ul className="space-y-4">
                {pendingTemplates.map((template) => (
                  <li key={template.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="muted">{template.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.event.name}
                    </p>
                    <ReviewTemplateButtons templateId={template.id} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboard club</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateClubForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link club admin</CardTitle>
            <CardDescription>
              Create the Auth user in Supabase first, then paste the UUID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteAdminForm
              clubs={clubs.map((c) => ({ id: c.id, name: c.name }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
