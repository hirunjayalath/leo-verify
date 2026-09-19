import { IssueWizard } from "@/components/admin/issue-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireClubAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminIssuePage() {
  const user = await requireClubAdmin();
  const events = await prisma.event.findMany({
    where: { clubId: user.clubId! },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Issue</h1>
        <p className="mt-1 text-muted-foreground">
          Guided flow: pick an event, add recipients, send verifiable
          credentials.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Issue wizard</CardTitle>
          <CardDescription>
            One certificate or bulk CSV/Excel — same validation rules as the
            certificates hub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IssueWizard events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
