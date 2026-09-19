import {
  Ban,
  Building2,
  CalendarDays,
  FileBadge2,
  LayoutTemplate,
} from "lucide-react";
import {
  CreateClubForm,
  InviteAdminForm,
  ReviewTemplateButtons,
} from "@/components/admin/district-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  const [issued, revoked, events, pendingTemplates, byClubStatus, recentCerts] =
    await Promise.all([
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
          status: { in: [TemplateStatus.draft, TemplateStatus.rejected] },
          club: { type: "public" },
        },
        include: {
          event: { select: { name: true } },
          club: { select: { name: true, type: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      clubIds.length === 0
        ? Promise.resolve([])
        : prisma.certificate.groupBy({
            by: ["clubId", "status"],
            where: { clubId: { in: clubIds } },
            _count: { _all: true },
          }),
      clubIds.length === 0
        ? Promise.resolve([])
        : prisma.certificate.findMany({
            where: {
              clubId: { in: clubIds },
              issueDate: {
                gte: new Date(
                  Date.UTC(
                    new Date().getUTCFullYear(),
                    new Date().getUTCMonth() - 11,
                    1,
                  ),
                ),
              },
            },
            select: { issueDate: true, status: true },
          }),
    ]);

  const perClub = clubs.map((club) => {
    const issuedCount =
      byClubStatus.find(
        (r) =>
          r.clubId === club.id && r.status === CertificateStatus.issued,
      )?._count._all ?? 0;
    const revokedCount =
      byClubStatus.find(
        (r) =>
          r.clubId === club.id && r.status === CertificateStatus.revoked,
      )?._count._all ?? 0;
    return { club, issued: issuedCount, revoked: revokedCount };
  });

  const monthKeys: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthKeys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  const byMonth = new Map(
    monthKeys.map((key) => [key, { issued: 0, revoked: 0 }]),
  );
  for (const cert of recentCerts) {
    const key = `${cert.issueDate.getUTCFullYear()}-${String(cert.issueDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(key);
    if (!bucket) continue;
    if (cert.status === CertificateStatus.issued) bucket.issued += 1;
    else if (cert.status === CertificateStatus.revoked) bucket.revoked += 1;
  }
  const monthlyRows = monthKeys.map((key) => ({
    key,
    label: new Date(`${key}-01T00:00:00Z`).toLocaleString("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }),
    ...(byMonth.get(key) ?? { issued: 0, revoked: 0 }),
  }));


  const stats = [
    {
      label: "Clubs",
      value: clubs.length,
      icon: Building2,
      tint: "bg-info-muted text-info",
    },
    {
      label: "Events",
      value: events,
      icon: CalendarDays,
      tint: "bg-accent/20 text-accent",
    },
    {
      label: "Certificates issued",
      value: issued,
      icon: FileBadge2,
      tint: "bg-success-muted text-success",
    },
    {
      label: "Revocations",
      value: revoked,
      icon: Ban,
      tint: "bg-danger-muted text-danger",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          District overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          {user.district?.name ?? "Your district"} — onboard clubs and review
          public-organization templates. Leo club templates auto-approve on
          create.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardDescription>{stat.label}</CardDescription>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tint}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <CardTitle className="text-3xl tabular-nums">
                  {stat.value}
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clubs</CardTitle>
            <CardDescription>
              Issued and revoked certificates by club
            </CardDescription>
          </CardHeader>
          <CardContent>
            {perClub.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No clubs yet"
                description="Onboard the first club in this district to begin."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Club</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Revoked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perClub.map(({ club, issued: count, revoked: rev }) => (
                    <TableRow key={club.id}>
                      <TableCell className="font-medium">{club.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {club.code}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {count}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {rev}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly activity</CardTitle>
            <CardDescription>
              Issued vs revoked by issue month (last 12 months, UTC)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRows.every((r) => r.issued === 0 && r.revoked === 0) ? (
              <EmptyState
                icon={CalendarDays}
                title="No certificates in the last year"
                description="Issuance activity across district clubs will show here."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Revoked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.issued}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.revoked}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public org template review</CardTitle>
            <CardDescription>
              Draft and rejected templates from public organizations. Leo clubs
              auto-approve and do not appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTemplates.length === 0 ? (
              <EmptyState
                icon={LayoutTemplate}
                title="Nothing to review"
                description="Public-organization drafts will appear here. Leo club templates skip this queue."
              />
            ) : (
              <ul className="space-y-4">
                {pendingTemplates.map((template) => (
                  <li
                    key={template.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="muted">{template.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.club.name} · {template.event.name}
                    </p>
                    {template.status === "draft" && (
                      <div className="mt-3">
                        <ReviewTemplateButtons templateId={template.id} />
                      </div>
                    )}
                    {template.status === "rejected" && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Rejected — club admins can revert to draft and edit.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboard club</CardTitle>
            <CardDescription>Creates a club under this district</CardDescription>
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
