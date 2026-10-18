import { requireUomPlatformAdmin } from "@/lib/auth";
import { prismaService } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  CreateDistrictForm,
  DisableDistrictAdminButton,
  InviteDistrictAdminForm,
} from "@/components/admin/operator-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OperatorsPage() {
  await requireUomPlatformAdmin();
  const [districts, admins] = await Promise.all([
    prismaService.district.findMany({
      orderBy: { name: "asc" },
      include: { clubs: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
    prismaService.user.findMany({
      where: { role: "district_admin" },
      orderBy: { email: "asc" },
      include: {
        district: { select: { name: true, code: true } },
        club: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-10 animate-fade-up">
      <AdminPageHeader
        eyebrow="Platform operations"
        title="Operators"
        description="Create districts and manage the administrators who operate them."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Districts
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {districts.length}
          </p>
        </Card>
        <Card className="p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            District admins
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {admins.length}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>District admins</CardTitle>
          <CardDescription>
            They manage one assigned club. You cannot open other clubs’
            certificate lists from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>District</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.email}</TableCell>
                        <TableCell>
                          {admin.district?.name} ({admin.district?.code})
                        </TableCell>
                        <TableCell>{admin.club?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={admin.disabledAt ? "muted" : "success"}>
                            {admin.disabledAt ? "Disabled" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {!admin.disabledAt && (
                            <DisableDistrictAdminButton userId={admin.id} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-3 md:hidden">
                {admins.map((admin) => (
                  <li
                    key={admin.id}
                    className="space-y-4 rounded-md border border-border p-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">{admin.email}</p>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            District
                          </dt>
                          <dd className="mt-1">
                            {admin.district?.name} ({admin.district?.code})
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Club
                          </dt>
                          <dd className="mt-1">{admin.club?.name ?? "—"}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <Badge variant={admin.disabledAt ? "muted" : "success"}>
                        {admin.disabledAt ? "Disabled" : "Active"}
                      </Badge>
                      {!admin.disabledAt && (
                        <DisableDistrictAdminButton userId={admin.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New district</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateDistrictForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invite district admin</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteDistrictAdminForm
              districts={districts.map((d) => ({
                id: d.id,
                name: d.name,
                clubs: d.clubs,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
