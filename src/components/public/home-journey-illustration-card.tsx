import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { JourneyLottiePanel } from "@/components/public/journey-lottie-panel";
import { cn } from "@/lib/utils";

export type JourneyCardItem = {
  step: string;
  title: string;
  body: string;
  href?: string;
};

export function HomeJourneyIllustrationCard({
  item,
  className,
}: {
  item: JourneyCardItem;
  className?: string;
}) {
  const badgeLabel = `Step ${item.step}`;

  const inner = (
    <Card
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border-border/80 p-0 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-float",
        className,
      )}
    >
      <div className="flex flex-1 flex-col p-5 pb-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <Badge variant="muted" className="text-[10px] font-semibold tracking-wide">
            {badgeLabel}
          </Badge>
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/50 text-muted-foreground"
            aria-hidden="true"
          >
            <ArrowUpRight className="size-3.5" />
          </span>
        </div>
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {item.body}
        </p>
      </div>
      <JourneyLottiePanel step={item.step} />
    </Card>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block h-full snap-start">
        {inner}
      </Link>
    );
  }

  return <article className="h-full snap-start">{inner}</article>;
}
