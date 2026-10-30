import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/10 bg-[linear-gradient(135deg,#0c2340_0%,#123b72_66%,#1e40af_100%)] p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border-[48px] border-white/[0.04]" />
      <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#ffd95e]">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl text-3xl font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 [&_a]:border-white/15 [&_button]:border-white/15">{action}</div>}
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tint: string;
  href?: string;
}) {
  const content = (
    <Card className={cn("h-full overflow-hidden border-primary/10 bg-card/95 transition-all", href && "group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-lg") }>
      <CardHeader className="gap-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground",
              tint,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <CardTitle className="mt-1 text-4xl font-semibold tabular-nums tracking-[-0.04em]">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pb-5 pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );

  if (!href) return content;
  return (
    <Link href={href} className="group block h-full">
      {content}
    </Link>
  );
}

export function AdminSectionHeading({
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="admin-rule flex items-start justify-between gap-4 border-b pb-4">
      <div>
        <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">
          {linkLabel}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
