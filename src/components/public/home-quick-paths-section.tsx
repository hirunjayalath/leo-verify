import Link from "next/link";
import type { HomeQuickPathItem } from "@/components/public/home-quick-path-card";
import { cn } from "@/lib/utils";

function QuickPathRow({
  item,
  index,
}: {
  item: HomeQuickPathItem;
  index: number;
}) {
  const Icon = item.icon;
  const indexLabel = String(index).padStart(2, "0");
  const isAnchor = item.href.startsWith("#");

  const content = (
    <>
      <span
        className="w-7 shrink-0 font-mono text-[11px] tabular-nums text-[var(--he-muted)] sm:w-8"
        aria-hidden="true"
      >
        {indexLabel}
      </span>
      <span
        className="flex size-9 shrink-0 items-center justify-center border border-[var(--he-line)] bg-[var(--he-surface)] text-[var(--he-fg)] transition-colors group-hover:bg-[var(--he-panel)]"
        aria-hidden="true"
      >
        <Icon className="size-4" strokeWidth={1.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-[var(--he-fg)]">
          {item.title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--he-muted)]">
          {item.description}
        </p>
      </div>
      <span
        className="hidden shrink-0 font-mono text-[10px] tracking-wide text-[var(--he-muted)] sm:block"
      >
        {item.code}
      </span>
      <span
        className="home-quick-path-row__arrow shrink-0 text-[var(--he-fg)]"
        aria-hidden="true"
      >
        <span className="home-quick-path-row__line" />
        <span className="home-quick-path-row__head" />
      </span>
    </>
  );

  const className = cn(
    "group flex min-w-0 items-center gap-2.5 border-b border-[var(--he-line)] px-4 py-4 transition-colors last:border-b-0 hover:bg-[var(--he-panel)] focus-visible:bg-[var(--he-panel)] focus-visible:outline-none sm:gap-4 sm:px-6 sm:py-6",
  );

  if (isAnchor) {
    return (
      <li>
        <a href={item.href} className={className}>
          {content}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link href={item.href} className={className}>
        {content}
      </Link>
    </li>
  );
}

export function HomeQuickPathsSection({
  items,
}: {
  items: HomeQuickPathItem[];
}) {
  return (
    <section
      className="mt-12 border-t border-[var(--he-line)] bg-[var(--he-surface)] sm:mt-16 md:mt-24"
      aria-labelledby="quick-paths-heading"
    >
      <div className="mx-auto max-w-6xl overflow-hidden border-y border-[var(--he-line)] sm:rounded-[1.75rem] sm:border lg:grid lg:grid-cols-[minmax(0,13.5rem)_minmax(0,1fr)] lg:items-stretch">
        <div className="border-b border-[var(--he-line)] px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:border-b-0 lg:border-r lg:py-14">
          <p className="text-[11px] font-medium tracking-wide text-[var(--he-muted)]">
            Quick paths
          </p>
          <h2
            id="quick-paths-heading"
            className="mt-2 text-xl font-semibold tracking-tight text-[var(--he-fg)] sm:text-2xl"
          >
            Get started
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--he-muted)]">
            Verify a credential, scan a QR, claim your portfolio, or register
            your club.
          </p>
          <span
            className="mt-8 hidden h-px w-10 bg-[var(--he-line-strong)] lg:block"
            aria-hidden="true"
          />
        </div>

        <ul className="min-w-0">
          {items.map((item, i) => (
            <QuickPathRow key={item.href} item={item} index={i + 1} />
          ))}
        </ul>
      </div>
    </section>
  );
}
