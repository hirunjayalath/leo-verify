import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type HomeQuickPathItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  code: string;
};

export function HomeQuickPathCard({
  item,
  className,
}: {
  item: HomeQuickPathItem;
  className?: string;
}) {
  const Icon = item.icon;
  const isAnchor = item.href.startsWith("#");

  const card = (
    <Card
      className={cn(
        "h-full transition-colors hover:border-accent/30 hover:shadow-card",
        className,
      )}
    >
      <CardContent className="flex h-full min-h-[8.5rem] min-w-0 flex-col !p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {item.title}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between text-muted-foreground">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {item.code}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (isAnchor) {
    return (
      <a href={item.href} className="block h-full min-w-0">
        {card}
      </a>
    );
  }

  return (
    <Link href={item.href} className="block h-full min-w-0">
      {card}
    </Link>
  );
}
