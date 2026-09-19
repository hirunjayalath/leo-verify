import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { ApproveTemplateButton } from "@/components/approve-template-button";
import { CreateTemplateForm } from "@/components/create-template-form";
import { GalleryCloneForm } from "@/components/gallery-clone-form";
import { RevertTemplateButton } from "@/components/revert-template-button";
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
import { getCachedGalleryPresets } from "@/lib/cache/safe-cache";
import { prisma } from "@/lib/db";
import { DuplicateTemplateButton } from "@/components/duplicate-template-button";

export default async function AdminTemplatesPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId!;

  const [templates, events, club, gallery] = await Promise.all([
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
    prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      select: { type: true },
    }),
    getCachedGalleryPresets(),
  ]);

  const isPublicOrg = club.type === "public";

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Background image plus field-position JSON — never hardcoded layouts.
          {isPublicOrg
            ? " Public-organization templates start as drafts until district approval."
            : " Leo club templates are approved on create so you can issue immediately."}
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
                            <Badge
                              variant={
                                template.status === "approved"
                                  ? "success"
                                  : template.status === "rejected"
                                    ? "danger"
                                    : "muted"
                              }
                            >
                              {template.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {template.status === "draft" && isPublicOrg && (
                                <span className="text-xs text-muted-foreground">
                                  Awaiting district review
                                </span>
                              )}
                              {template.status === "draft" && !isPublicOrg && (
                                <ApproveTemplateButton templateId={template.id} />
                              )}
                              {template.status === "rejected" && (
                                <RevertTemplateButton templateId={template.id} />
                              )}
                              <Link
                                href={`/admin/templates/${template.id}/edit`}
                                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                              >
                                Edit layout
                              </Link>
                              <DuplicateTemplateButton templateId={template.id} />
                            </div>
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
                          {template.event.name} · {template.status}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {template.status === "rejected" && (
                          <RevertTemplateButton templateId={template.id} />
                        )}
                        {template.status === "draft" && !isPublicOrg && (
                          <ApproveTemplateButton templateId={template.id} />
                        )}
                        <Link
                          href={`/admin/templates/${template.id}/edit`}
                          className="text-sm font-medium text-primary"
                        >
                          Edit
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Starter gallery</CardTitle>
              <CardDescription>
                Pick a professional background and layout, then refine in the
                designer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GalleryCloneForm events={events} gallery={gallery} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New template</CardTitle>
              <CardDescription>
                PNG or JPEG background only.
                {isPublicOrg
                  ? " Created as draft for district review."
                  : " Created templates are approved and ready to issue."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTemplateForm events={events} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
