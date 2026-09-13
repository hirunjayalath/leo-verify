import Link from "next/link";
import { CreateTemplateForm } from "@/components/create-template-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Templates
        </h1>
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
              <p className="text-sm text-muted-foreground">
                Upload a background to open the designer.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.event.name}
                      </p>
                    </div>
                    <Link
                      href={`/admin/templates/${template.id}/edit`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Edit layout
                    </Link>
                  </li>
                ))}
              </ul>
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
