import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateDesigner } from "@/components/template-designer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireClubAdmin } from "@/lib/auth";
import {
  templateLayoutSchema,
  type TemplateLayout,
} from "@/lib/certificates/layout";
import { prisma } from "@/lib/db";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireClubAdmin();
  const template = await prisma.certificateTemplate.findFirst({
    where: { id, clubId: user.clubId! },
    include: { event: { select: { name: true } } },
  });
  if (!template) notFound();

  const parsed = templateLayoutSchema.safeParse(template.layout);
  const layout: TemplateLayout = parsed.success ? parsed.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/admin/templates"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              ← Back to templates
            </Link>
            <span className="mx-2 text-border">/</span>
            {template.event.name}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">
            {template.name}
          </h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Layout designer</CardTitle>
          <CardDescription>
            Drag fields onto the background, then save. Preview renders with pdf-lib.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateDesigner
            templateId={template.id}
            backgroundUrl={template.backgroundUrl}
            initialLayout={layout}
          />
        </CardContent>
      </Card>
    </div>
  );
}
