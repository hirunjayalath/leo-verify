import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { ApproveTemplateButton } from "@/components/admin/approve-template-button";
import { CreateTemplateForm } from "@/components/admin/create-template-form";
import { GalleryCloneForm } from "@/components/admin/gallery-clone-form";
import { RevertTemplateButton } from "@/components/admin/revert-template-button";
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
import { requireClubAdmin, withSessionRls } from "@/lib/auth";
import { getCachedGalleryPresets } from "@/lib/cache/safe-cache";
import { prisma } from "@/lib/db";
import { DuplicateTemplateButton } from "@/components/admin/duplicate-template-button";

export default async function AdminTemplatesPage() {
  const user = await requireClubAdmin();
  const clubId = user.clubId;

  const gallery = await getCachedGalleryPresets();
  const [templates, events, club] = await withSessionRls(user, async () => {
    const rows = await prisma.certificateTemplate.findMany({
      where: { clubId },
      orderBy: { updatedAt: "desc" },
      include: { event: { select: { name: true } } },
    });
    const eventRows = await prisma.event.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
    const clubRow = await prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      select: { type: true },
    });
    return [rows, eventRows, clubRow] as const;
  });

  const isPublicOrg = club.type === "public";

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-muted-foreground">
          Upload a background and place the name, role, and other fields on it.
          {isPublicOrg
            ? " Public-organization templates start as drafts until district approval."
            : " Leo club templates are approved on create so you can issue immediately."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Designer checklist</CardTitle>
          <CardDescription>
            One design per template. An event can have a certificate and a
            service letter. Paint the artwork, then place merge fields — the PNG
            is not scanned.{" "}
            <Link
              href="/admin/templates/guide"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Full designer guide
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Export <strong className="text-foreground">A4 landscape</strong>{" "}
              PNG at 1684×1190 px (under 5 MB). Avoid 16:9 — it stretches on the
              PDF.
            </li>
            <li>
              Paint title, sentences, event title, club/logo, and signature
              lines on the PNG.
            </li>
            <li>
              Leave gaps for <strong className="text-foreground">name</strong>,{" "}
              <strong className="text-foreground">role</strong>, optional
              achievement, date, ID (bottom left), and QR (bottom right, with
              space around it).
            </li>
            <li>
              CSV supplies name, role, achievement, and email. Date, ID, and QR
              come from issue. If you paint event or club on the PNG, delete
              those fields in the designer.
            </li>
          </ul>
        </CardContent>
      </Card>

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
                        <TableHead>Kind</TableHead>
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
                          <TableCell className="text-muted-foreground">
                            {template.kind === "service_letter"
                              ? "Service letter"
                              : "Certificate"}
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
                          {template.event.name} ·{" "}
                          {template.kind === "service_letter"
                            ? "service letter"
                            : "certificate"}{" "}
                          · {template.status}
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
                Pick a background and layout, then adjust it in the designer.
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
