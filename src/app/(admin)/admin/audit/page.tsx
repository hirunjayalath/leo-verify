import { ScrollText } from "lucide-react";
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
import { requireClubAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminAuditPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const logs = await prisma.auditLog.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-muted-foreground">
          Append-only history of issue, revoke, reissue, and template edits.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            {logs.length === 0
              ? "No activity yet"
              : `Showing ${logs.length} most recent entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No activity yet"
              description="Creates and updates will appear here."
            />
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.targetType}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.actor?.email ?? "system"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">
                          {log.createdAt
                            .toISOString()
                            .replace("T", " ")
                            .slice(0, 19)}{" "}
                          UTC
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="space-y-3 sm:hidden">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-border p-4 text-sm"
                  >
                    <p className="font-medium">
                      {log.action}{" "}
                      <span className="font-normal text-muted-foreground">
                        on {log.targetType}
                      </span>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {log.actor?.email ?? "system"} ·{" "}
                      {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}{" "}
                      UTC
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
