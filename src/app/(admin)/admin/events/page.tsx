import { CalendarDays } from "lucide-react";
import { CreateEventForm } from "@/components/admin/create-event-form";
import { EditEventForm } from "@/components/admin/edit-event-form";
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
import { requireClubAdmin, withSessionRls } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminEventsPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId;

  const events = await withSessionRls(user, () => prisma.event.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { certificates: true, templates: true } },
    },
  }));

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-muted-foreground">
          Events group templates and certificate batches for your club.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Your events</CardTitle>
            <CardDescription>
              {events.length === 0
                ? "No events yet. Create one to start."
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
                        <TableHead className="text-right">Actions</TableHead>
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
                              : "None"}
                          </TableCell>
                          <TableCell>{event._count.templates}</TableCell>
                          <TableCell>{event._count.certificates}</TableCell>
                          <TableCell className="text-right">
                            <EditEventForm
                              event={{
                                id: event.id,
                                name: event.name,
                                description: event.description,
                                eventDate: event.eventDate
                                  ? event.eventDate.toISOString().slice(0, 10)
                                  : null,
                              }}
                            />
                          </TableCell>
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
                        · {event._count.templates}{" "}
                        {event._count.templates === 1 ? "template" : "templates"}{" "}
                        · {event._count.certificates}{" "}
                        {event._count.certificates === 1
                          ? "certificate"
                          : "certificates"}
                      </p>
                      <EditEventForm
                        event={{
                          id: event.id,
                          name: event.name,
                          description: event.description,
                          eventDate: event.eventDate
                            ? event.eventDate.toISOString().slice(0, 10)
                            : null,
                        }}
                      />
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
            <CardDescription>This write is saved in the audit log.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateEventForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
