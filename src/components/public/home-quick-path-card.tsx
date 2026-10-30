import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { HomeQuickPathMark } from "@/components/public/home-quick-path-mark";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type HomeQuickPathItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  code: string;
};

const editorialTones = {
  surface: "bg-[var(--he-surface)] text-[var(--he-fg)]",
  panel: "bg-[var(--he-panel)] text-[var(--he-fg)]",
  dark: "home-editorial-tile-dark text-[var(--he-tile-ink)]",
  mid: "home-editorial-tile-mid text-white",
} as const;

export type HomeQuickPathTone = keyof typeof editorialTones;

export function HomeQuickPathCard({
  item,
  className,
  variant = "default",
  tone = "surface",
}: {
  item: HomeQuickPathItem;
  className?: string;
  variant?: "default" | "editorial";
  tone?: HomeQuickPathTone;
}) {
  const Icon = item.icon;
  const isAnchor = item.href.startsWith("#");
  const isEditorial = variant === "editorial";

  const card = isEditorial ? (
    <div
      className={cn(
        "flex h-full min-h-[18rem] flex-col items-center justify-center border border-[var(--he-line)] px-8 py-12 text-center",
        editorialTones[tone],
        className,
      )}
    >
      <HomeQuickPathMark code={item.code} className="mb-6" />
      <p className="text-base font-medium leading-snug">{item.title}</p>
      <span className="mt-3 h-px w-8 bg-current opacity-70" aria-hidden="true" />
      <p className="mt-3 max-w-[14rem] text-xs leading-relaxed opacity-80">
        {item.description}
      </p>
      <span className="mt-4 font-mono text-[10px] tracking-wide opacity-70">
        {item.code}
      </span>
    </div>
  ) : (
    <Card
      className={cn(
        "h-full transition-colors",
        isEditorial
          ? "rounded-none border-[var(--he-line-strong)] bg-[var(--he-surface)] shadow-none hover:bg-[var(--he-panel)]"
          : "hover:border-accent/30 hover:shadow-card",
        className,
      )}
    >
      <CardContent
        className={cn(
          "flex h-full min-w-0 flex-col !p-5",
          isEditorial ? "min-h-[9rem]" : "min-h-[8.5rem]",
        )}
      >
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-semibold leading-snug",
              isEditorial ? "text-[var(--he-fg)]" : "text-foreground",
            )}
          >
            {item.title}
          </p>
          <p
            className={cn(
              "mt-2 text-xs leading-relaxed",
              isEditorial ? "text-[var(--he-muted)]" : "text-muted-foreground",
            )}
          >
            {item.description}
          </p>
        </div>
        <div
          className={cn(
            "mt-4 flex items-center justify-between",
            isEditorial ? "text-[var(--he-fg)]" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.25} />
          <span className="flex flex-col items-end gap-1">
            <span
              className={cn(
                "font-mono text-[10px]",
                isEditorial
                  ? "text-[var(--he-muted)]"
                  : "text-muted-foreground/70",
              )}
            >
              {item.code}
            </span>
            {isEditorial ? (
              <span
                className="h-px w-6 bg-[var(--he-line-strong)]"
                aria-hidden="true"
              />
            ) : null}
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
