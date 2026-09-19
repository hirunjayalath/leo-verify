import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Ban,
  CalendarDays,
  ClipboardList,
  FileBadge2,
  FileUp,
  LayoutTemplate,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CertificateStatus } from "@/generated/prisma/client";
import { requireClubAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatAuditAction, formatRelativeTime } from "@/lib/format";

export default async function AdminDashboardPage() {
  const user = await requireClubAdmin();
  if (user.role === "district_admin" && !user.clubId) {
    redirect("/admin/district");
  }
  const clubId = user.clubId!;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    events,
    certificatesIssued,
    templates,
    revocations,
    recentAudit,
    issuedThisMonth,
    emailsSent,
    topEvents,
    club,
  ] = await Promise.all([
    prisma.event.count({ where: { clubId } }),
    prisma.certificate.count({
      where: { clubId, status: CertificateStatus.issued },
    }),
    prisma.certificateTemplate.count({ where: { clubId } }),
    prisma.certificate.count({
      where: { clubId, status: CertificateStatus.revoked },
    }),
    prisma.auditLog.findMany({
      where: { clubId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: { select: { email: true, name: true } } },
    }),
    prisma.certificate.count({
      where: {
        clubId,
        status: CertificateStatus.issued,
        createdAt: { gte: monthStart },
      },
    }),
    prisma.auditLog.count({
      where: {
        clubId,
        action: "certificate.issue",
        createdAt: { gte: monthStart },
      },
    }),
    prisma.certificate.groupBy({
      by: ["eventId"],
      where: { clubId, status: CertificateStatus.issued },
      _count: { _all: true },
      orderBy: { _count: { eventId: "desc" } },
      take: 5,
    }),
    prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      select: {
        monthlyCertLimit: true,
        publicSlug: true,
        name: true,
      },
    }),
  ]);

  const topEventIds = topEvents.map((t) => t.eventId);
  const eventNames = topEventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: topEventIds } },
        select: { id: true, name: true },
      })
    : [];
  const topEventRows = topEvents.map((t) => ({
    name: eventNames.find((e) => e.id === t.eventId)?.name ?? t.eventId,
    count: t._count._all,
  }));

  const needsOnboarding =
    events === 0 && templates === 0 && certificatesIssued === 0;

  const firstIssueSteps = [
    {
      n: "1",
      title: "Create an event",
      body: "Scope templates and certificate batches.",
      href: "/admin/events",
      done: events > 0,
    },
    {
      n: "2",
      title: "Approve a template",
      body: "Upload a background — club templates auto-approve on create.",
      href: "/admin/templates",
      done: templates > 0,
    },
    {
      n: "3",
      title: "Issue a certificate",
      body: "Issue one recipient or import a CSV roster.",
      href: "/admin/certificates",
      done: certificatesIssued > 0,
    },
    {
      n: "4",
      title: "Open the verify link",
      body: "After issue, copy the verify link from the success toast and open /v.",
      href: "/admin/certificates",
      done: certificatesIssued > 0,
    },
  ];

  const stats = [
    {
      label: "Events",
      value: events,
      hint: events === 0 ? "Create your first event" : "Active event records",
      icon: CalendarDays,
      tint: "bg-info-muted text-info",
      href: "/admin/events",
    },
    {
      label: "Issued (all time)",
      value: certificatesIssued,
      hint:
        certificatesIssued === 0
          ? "Issue or import a roster"
          : "Currently valid",
      icon: FileBadge2,
      tint: "bg-success-muted text-success",
      href: "/admin/certificates",
    },
    {
      label: "Issued this month",
      value: issuedThisMonth,
      hint: `Monthly quota ${club.monthlyCertLimit}`,
      icon: FileUp,
      tint: "bg-accent/20 text-accent",
      href: "/admin/issue",
    },
    {
      label: "Revocations",
      value: revocations,
      hint: "Status flag only — never deleted",
      icon: Ban,
      tint: "bg-danger-muted text-danger",
      href: "/admin/certificates",
    },
  ];

  const actions = [
    { href: "/admin/events", label: "New event", icon: ClipboardList },
    { href: "/admin/templates", label: "New template", icon: LayoutTemplate },
    { href: "/admin/certificates", label: "Issue one", icon: FileBadge2 },
    { href: "/admin/certificates", label: "Import CSV", icon: FileUp },
  ];

  const onboarding = [
    {
      n: "1",
      title: "Create an event",
      body: "Scope templates and certificate batches.",
      href: "/admin/events",
    },
    {
      n: "2",
      title: "Design a template",
      body: "Upload a background and place fields.",
      href: "/admin/templates",
    },
    {
      n: "3",
      title: "Issue or import",
      body: "Issue one certificate or upload a CSV roster.",
      href: "/admin/certificates",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Issue and manage certificates for {user.club?.name ?? "your club"}.
        </p>
      </div>

      {needsOnboarding && (
        <Card className="border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle>Get started in three steps</CardTitle>
            <CardDescription>
              Your club is ready — walk through the golden path once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4 sm:grid-cols-3">
              {onboarding.map((step) => (
                <li key={step.n}>
                  <Link
                    href={step.href}
                    className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
                  >
                    <span className="font-mono text-sm font-semibold text-accent">
                      {step.n}
                    </span>
                    <p className="mt-2 font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.body}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {!needsOnboarding && certificatesIssued === 0 && (
        <Card className="border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle>First-issue checklist</CardTitle>
            <CardDescription>
              Finish the path: event → template → issue → open the public verify
              page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {firstIssueSteps.map((step) => (
                <li key={step.n}>
                  <Link
                    href={step.href}
                    className="block h-full rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-accent">
                        {step.n}
                      </span>
                      <span
                        className={
                          step.done
                            ? "text-xs font-medium text-success"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {step.done ? "Done" : "Todo"}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{step.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.body}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="group">
              <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <CardDescription>{stat.label}</CardDescription>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tint}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <CardTitle className="text-3xl tabular-nums">
                    {stat.value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{stat.hint}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
            <CardDescription>
              Issuance volume this calendar month
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Issued:{" "}
              <span className="font-semibold tabular-nums">
                {issuedThisMonth}
              </span>{" "}
              / {club.monthlyCertLimit}
            </p>
            <p>
              Issue audit events:{" "}
              <span className="font-semibold tabular-nums">{emailsSent}</span>
            </p>
            <p>
              Templates:{" "}
              <span className="font-semibold tabular-nums">{templates}</span>
              {club.publicSlug ? (
                <>
                  {" "}
                  · Portal{" "}
                  <Link
                    href={`/o/${club.publicSlug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    /o/{club.publicSlug}
                  </Link>
                </>
              ) : null}
            </p>
            <Link
              href="/admin/settings"
              className="inline-block pt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Manage branding
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top events</CardTitle>
            <CardDescription>By issued certificates</CardDescription>
          </CardHeader>
          <CardContent>
            {topEventRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certificates yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topEventRows.map((row) => (
                  <li
                    key={row.name}
                    className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"
                  >
                    <span className="truncate">{row.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest attributed writes for this club</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activity yet — create an event to get started.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentAudit.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {formatAuditAction(log.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.actor?.name || log.actor?.email || "system"} ·{" "}
                        {log.targetType}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-xs text-muted-foreground"
                      dateTime={log.createdAt.toISOString()}
                      title={log.createdAt.toISOString()}
                    >
                      {formatRelativeTime(log.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Jump into the next step</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  {action.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
