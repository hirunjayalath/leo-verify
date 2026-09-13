import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminAuditPage() {
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
          <CardTitle>No activity yet</CardTitle>
          <CardDescription>
            Certificates are never silently deleted — revocation is a status flag with
            reason and actor.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
