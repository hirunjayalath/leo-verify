import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { BrandMark, CLUB_UOM_LOGO_SRC } from "@/components/public/brand-logo";
import { HomeVerifyIllustration } from "@/components/public/home-verify-illustration";
import { cn } from "@/lib/utils";

export function HomeEditorialHero({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "home-editorial-hero relative w-full overflow-hidden border-b border-[var(--he-line)]",
        className,
      )}
      aria-label="Introduction"
    >
      <div className="home-editorial-hero-glow" aria-hidden="true" />
      <div className="relative mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)] lg:gap-7 lg:py-16">
        <div
          id="verify"
          className="home-editorial-hero-card flex min-w-0 flex-col justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14"
        >
          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="home-editorial-status-dot" aria-hidden="true" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--he-muted)] sm:text-[11px]">
                Public registry online
              </span>
            </div>
            <div className="flex items-center gap-2" aria-hidden="true">
              <BrandMark size={34} priority className="size-8 rounded-lg sm:size-9" />
              <Image
                src={CLUB_UOM_LOGO_SRC}
                alt=""
                width={36}
                height={36}
                className="size-8 rounded-full object-cover sm:size-9"
                priority
              />
            </div>
          </div>

          {children}

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--he-line)] pt-5 text-xs font-medium text-[var(--he-muted)]">
            <span className="inline-flex items-center gap-2">
              <BadgeCheck className="size-4 text-[var(--he-accent-ink)]" aria-hidden="true" />
              Signed QR links
            </span>
            <span className="inline-flex items-center gap-2">
              <BadgeCheck className="size-4 text-[var(--he-accent-ink)]" aria-hidden="true" />
              Live certificate status
            </span>
          </div>
        </div>

        <div className="home-editorial-visual-card flex min-h-[27rem] min-w-0 flex-col overflow-hidden sm:min-h-[32rem]">
          <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-5 text-white sm:px-7 sm:pt-7">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Verified at the source
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/80">
              <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Live
            </span>
          </div>
          <div className="home-editorial-visual-stage mx-4 mt-3 flex min-h-[17rem] flex-1 items-center justify-center overflow-hidden rounded-[1.25rem] sm:mx-6 sm:min-h-[20rem]">
            <HomeVerifyIllustration />
          </div>
          <div className="flex flex-col gap-5 px-5 py-6 text-white sm:px-7 sm:py-7">
            <div>
              <p className="text-lg font-semibold tracking-tight sm:text-xl">
                Scan the QR. Trust the registry.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                The live record confirms authenticity, issue status, and the
                organization behind every credential.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                How it works
              </Link>
              <Link
                href="/signup"
                className="home-editorial-primary-link inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Issue certificates
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
