import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { CreateTemplateForm } from "@/components/create-template-form";
import { Badge } from "@/components/ui/badge";
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

export default async function AdminTemplatesPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const [templates, events] = await Promise.all([
    prisma.certificateTemplate.findMany({
      where: { clubId },
      orderBy: { updatedAt: "desc" },
      include: { event: { select: { name: true } } },
    }),
    prisma.event.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Background image plus field-position JSON — never hardcoded layouts.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Saved templates</CardTitle>
            <CardDescription>
              {templates.length === 0
                ? "No templates yet"
                : `${templates.length} template${templates.length === 1 ? "" : "s"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <EmptyState
                icon={LayoutTemplate}
                title="No templates yet"
                description="Upload a background to open the designer."
              />
            ) : (
              <>
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">
                            {template.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {template.event.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="muted">{template.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/admin/templates/${template.id}/edit`}
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                              Edit layout
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="space-y-3 sm:hidden">
                  {templates.map((template) => (
                    <li
                      key={template.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"
                    >
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.event.name}
                        </p>
                      </div>
                      <Link
                        href={`/admin/templates/${template.id}/edit`}
                        className="text-sm font-medium text-primary"
                      >
                        Edit
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New template</CardTitle>
            <CardDescription>PNG or JPEG background recommended.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateTemplateForm events={events} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
