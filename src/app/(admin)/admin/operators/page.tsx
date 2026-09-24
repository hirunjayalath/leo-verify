import { requireUomPlatformAdmin } from "@/lib/auth";
import { prismaService } from "@/lib/db";
import {
  CreateDistrictForm,
  DisableDistrictAdminButton,
  InviteDistrictAdminForm,
} from "@/components/admin/operator-forms";
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
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Operators</h1>
        <p className="mt-1 text-muted-foreground">
          Only the UOM club admin can create and disable district admins.
        </p>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      {admin.district?.name} ({admin.district?.code})
                    </TableCell>
                    <TableCell>{admin.club?.name ?? "—"}</TableCell>
                    <TableCell>
                      {admin.disabledAt ? "Disabled" : "Active"}
                    </TableCell>
                    <TableCell>
                      {!admin.disabledAt && (
                        <DisableDistrictAdminButton userId={admin.id} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
