import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatAuditAction, formatRelativeTime } from "@/lib/format";

const PAGE_SIZE = 50;

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where: { clubId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            {total === 0
              ? "No activity yet"
              : `Showing ${logs.length} of ${total} entries`}
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
                        <TableCell className="font-medium">
                          {formatAuditAction(log.action)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.targetType}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.actor?.email ?? "system"}
                        </TableCell>
                        <TableCell
                          className="text-xs text-muted-foreground"
                          title={log.createdAt.toISOString()}
                        >
                          {formatRelativeTime(log.createdAt)}
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
                      {formatAuditAction(log.action)}{" "}
                      <span className="font-normal text-muted-foreground">
                        on {log.targetType}
                      </span>
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {log.actor?.email ?? "system"} ·{" "}
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                  <p className="text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 ? (
                      <Link href={`/admin/audit?page=${page - 1}`}>
                        <Button variant="outline" size="sm">
                          Previous
                        </Button>
                      </Link>
                    ) : null}
                    {page < totalPages ? (
                      <Link href={`/admin/audit?page=${page + 1}`}>
                        <Button variant="outline" size="sm">
                          Next
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
