import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HomeJourneyMark } from "@/components/public/home-journey-mark";
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
  variant = "default",
  illustrationSide = "end",
}: {
  item: JourneyCardItem;
  className?: string;
  variant?: "default" | "editorial";
  illustrationSide?: "start" | "end";
}) {
  const isEditorial = variant === "editorial";
  const badgeLabel = `Step ${item.step}`;

  if (isEditorial) {
    const copy = (
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-10 md:px-12 md:py-14">
        <p
          className="font-display text-4xl font-medium tabular-nums tracking-tight text-[var(--he-fg)] opacity-25 sm:text-5xl md:text-6xl"
          aria-hidden="true"
        >
          {item.step}
        </p>
        <p className="sr-only">{badgeLabel}</p>
        <h3 className="mt-2 text-left text-2xl font-medium text-[var(--he-fg)]">
          {item.title}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--he-muted)]">
          {item.body}
        </p>
      </div>
    );
    const art = (
      <div
        className={cn(
          "home-editorial-journey-art flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-10",
          illustrationSide === "start" ? "bg-[var(--he-panel)]" : "bg-[var(--he-surface)]",
        )}
      >
        <HomeJourneyMark
          step={item.step}
          className="h-28 w-36 sm:h-36 sm:w-48 md:h-44 md:w-56"
        />
      </div>
    );
    const band = (
      <div
        className={cn(
          "home-editorial-journey-band grid min-h-0 overflow-hidden border border-[var(--he-line)] bg-[var(--he-surface)] md:min-h-[14rem] lg:grid-cols-2 lg:min-h-[16rem]",
          className,
        )}
      >
        {illustrationSide === "start" ? (
          <>
            {art}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {art}
          </>
        )}
      </div>
    );
    return <article className="snap-start">{band}</article>;
  }

  const inner = (
    <Card
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden p-0 transition-all duration-200",
        isEditorial
          ? "rounded-none border-0 bg-[var(--he-surface)] shadow-none"
          : "rounded-3xl border-border/80 shadow-card hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-float",
        className,
      )}
    >
      <div className="flex flex-1 flex-col p-5 pb-4">
        {isEditorial ? (
          <p
            className="font-display text-4xl font-medium tabular-nums tracking-tight text-[var(--he-fg)] opacity-20"
            aria-hidden="true"
          >
            {item.step}
          </p>
        ) : (
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
        )}
        {isEditorial ? (
          <p className="sr-only">{badgeLabel}</p>
        ) : null}
        <h3
          className={cn(
            "font-semibold leading-snug",
            isEditorial
              ? "mt-1 text-left text-base text-[var(--he-fg)]"
              : "text-base text-foreground",
          )}
        >
          {item.title}
        </h3>
        <p
          className={cn(
            "mt-2 line-clamp-4 text-xs leading-relaxed",
            isEditorial ? "text-[var(--he-muted)]" : "text-muted-foreground",
          )}
        >
          {item.body}
        </p>
      </div>
      {isEditorial ? (
        <div className="flex items-end justify-start px-5 pb-5">
          <HomeJourneyMark step={item.step} />
        </div>
      ) : (
        <JourneyLottiePanel step={item.step} />
      )}
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
