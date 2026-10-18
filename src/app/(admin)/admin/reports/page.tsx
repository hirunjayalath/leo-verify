import { requireUomPlatformAdmin } from "@/lib/auth";
import { getPlatformClubReport } from "@/lib/orgs/platform";
import { AdminPageHeader } from "@/components/admin/admin-ui";
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

export default async function ReportsPage() {
  await requireUomPlatformAdmin();
  const rows = await getPlatformClubReport();

  return (
    <div className="space-y-10 animate-fade-up">
      <AdminPageHeader
        eyebrow="Platform operations"
        title="Reports"
        description="Club activity counts only. Recipient names and emails are not included."
      />
      <Card>
        <CardHeader>
          <CardTitle>Club activity</CardTitle>
          <CardDescription>
            Issued and revoked totals per club. Open a club dashboard only for
            UOM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clubs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Club</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Revoked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.clubId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell>{row.events}</TableCell>
                    <TableCell>{row.issued}</TableCell>
                    <TableCell>{row.revoked}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
