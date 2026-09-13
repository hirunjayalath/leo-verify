import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminCertificatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Certificates
        </h1>
        <p className="mt-1 text-muted-foreground">
          Issue, revoke, and reissue — every write is attributed in the audit log.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No certificates yet</CardTitle>
          <CardDescription>
            Bulk CSV import will validate all rows up front and process each row
            independently (idempotent & resumable).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
