import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Events</h1>
        <p className="mt-1 text-muted-foreground">
          Events scope templates and certificate batches to a club.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No events yet</CardTitle>
          <CardDescription>
            Event creation and roster upload land in the next build.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
