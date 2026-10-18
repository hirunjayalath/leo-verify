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
    <div className="admin-rule flex flex-col gap-7 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
    <Card className={cn("h-full rounded-none border-x-0 border-b-0 bg-transparent transition-colors", href && "group-hover:border-foreground/40") }>
      <CardHeader className="gap-5 px-0 pb-5 pt-0">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center border border-border text-muted-foreground",
              tint,
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        </div>
        <CardTitle className="mt-1 text-4xl font-medium tabular-nums tracking-[-0.04em]">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="px-0 pb-0 pt-0">
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
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground hover:underline">
          {linkLabel}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
