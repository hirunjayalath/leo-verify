import { CalendarDays } from "lucide-react";
import { CreateEventForm } from "@/components/create-event-form";
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

export default async function AdminEventsPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const events = await prisma.event.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { certificates: true, templates: true } },
    },
  });

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-muted-foreground">
          Events scope templates and certificate batches to your club.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Your events</CardTitle>
            <CardDescription>
              {events.length === 0
                ? "No events yet — create one to begin."
                : `${events.length} event${events.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No events yet"
                description="Create an event, then attach a certificate template."
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Templates</TableHead>
                        <TableHead>Certificates</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">
                            {event.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground tabular-nums">
                            {event.eventDate
                              ? event.eventDate.toISOString().slice(0, 10)
                              : "—"}
                          </TableCell>
                          <TableCell>{event._count.templates}</TableCell>
                          <TableCell>{event._count.certificates}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="space-y-3 sm:hidden">
                  {events.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <p className="font-medium">{event.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.eventDate
                          ? event.eventDate.toISOString().slice(0, 10)
                          : "No date"}{" "}
                        · {event._count.templates} templates ·{" "}
                        {event._count.certificates} certificates
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New event</CardTitle>
            <CardDescription>Creates an audit log entry.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateEventForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
