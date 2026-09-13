import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireClubAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CertificateStatus } from "@/generated/prisma/client";

export default async function AdminDashboardPage() {
  const user = await requireClubAdmin();
  if (user.role === "district_admin" && !user.clubId) {
    redirect("/admin/district");
  }
  const clubId = user.clubId!;

  const [events, certificatesIssued, templates, revocations] =
    await Promise.all([
      prisma.event.count({ where: { clubId } }),
      prisma.certificate.count({
        where: { clubId, status: CertificateStatus.issued },
      }),
      prisma.certificateTemplate.count({ where: { clubId } }),
      prisma.certificate.count({
        where: { clubId, status: CertificateStatus.revoked },
      }),
    ]);

  const stats = [
    {
      label: "Events",
      value: String(events),
      hint: events === 0 ? "Create your first event to begin" : "Active event records",
    },
    {
      label: "Certificates issued",
      value: String(certificatesIssued),
      hint:
        certificatesIssued === 0
          ? "Bulk CSV issuance comes next"
          : "Currently valid certificates",
    },
    {
      label: "Templates",
      value: String(templates),
      hint:
        templates === 0
          ? "Upload a background and position fields"
          : "Saved certificate layouts",
    },
    {
      label: "Revocations",
      value: String(revocations),
      hint: "Status flag only — never deleted",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Issue and manage certificates for {user.club?.name ?? "your club"}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
