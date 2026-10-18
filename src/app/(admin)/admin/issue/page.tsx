import { IssueWizard } from "@/components/admin/issue-wizard";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireClubAdmin, withSessionRls } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminIssuePage() {
  const user = await requireClubAdmin();
  const events = await withSessionRls(user, () =>
    prisma.event.findMany({
      where: { clubId: user.clubId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        templates: {
          where: { status: "approved" },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true },
        },
      },
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-10 animate-fade-up">
      <AdminPageHeader
        eyebrow="Certificate workflow"
        title="Issue certificates"
        description="Pick an event, add recipients, and send certificates."
      />
      <Card>
        <CardHeader>
          <CardTitle>Issue wizard</CardTitle>
          <CardDescription>
            One certificate or a CSV/Excel roster. Same checks as the
            certificates page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IssueWizard events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
