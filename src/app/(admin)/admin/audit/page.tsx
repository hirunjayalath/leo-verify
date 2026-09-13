import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Audit log
        </h1>
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
            <p className="text-sm text-muted-foreground">
              Creates and updates will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((log) => (
                <li key={log.id} className="py-3 text-sm">
                  <p className="font-medium">
                    {log.action}{" "}
                    <span className="font-normal text-muted-foreground">
                      on {log.targetType}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    {log.actor?.email ?? "system"} ·{" "}
                    {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}{" "}
                    UTC
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
