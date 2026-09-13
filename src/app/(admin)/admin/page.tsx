import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  { label: "Events", value: "—", hint: "Create your first event to begin" },
  { label: "Certificates issued", value: "—", hint: "Bulk CSV issuance comes next" },
  { label: "Templates", value: "—", hint: "Upload a background and position fields" },
  { label: "Revocations", value: "—", hint: "Status flag only — never deleted" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Issue and manage certificates for your club. Multi-tenant schema is ready
          for district expansion.
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

      <Card>
        <CardHeader>
          <CardTitle>Next steps</CardTitle>
          <CardDescription>
            This shell is ready for issuance, template designer, and CSV import builds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Connect Supabase (database + Auth + RLS policies).</li>
            <li>Create an event and upload a certificate template background.</li>
            <li>Import a roster and run bulk issuance via a background job.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
