import Image from "next/image";
import Link from "next/link";
import { BrandMark, CLUB_UOM_LOGO_SRC } from "@/components/public/brand-logo";
import { HomeVerifyIllustration } from "@/components/public/home-verify-illustration";
import { cn } from "@/lib/utils";

function GridMark() {
  return (
    <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="size-2 bg-[var(--he-fg)]" />
      <span className="size-2 bg-[var(--he-fg)]" />
      <span className="size-2 bg-[var(--he-fg)]" />
      <span className="size-2 bg-[var(--he-fg)]" />
    </span>
  );
}

export function HomeEditorialHero({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn("home-editorial-hero w-full", className)}
      aria-label="Introduction"
    >
      <div className="flex w-full flex-col lg:flex-row lg:items-start">
          {/* Left rail */}
          <div
            className="home-editorial-panel flex flex-row items-center justify-between gap-4 border-b border-[var(--he-line)] px-4 py-3 lg:h-[calc(100svh-8rem)] lg:min-h-[36rem] lg:w-14 lg:flex-col lg:justify-between lg:self-start lg:border-b-0 lg:border-r lg:px-0 lg:py-8"
          >
            <Link
              href="/"
              className="inline-flex shrink-0 p-1 transition-opacity hover:opacity-70"
              aria-label="LeoVerify home"
            >
              <GridMark />
            </Link>
            <a
              href="#verify"
              className="hidden text-[10px] font-medium tracking-[0.2em] text-[var(--he-muted)] [writing-mode:vertical-rl] rotate-180 lg:inline-flex lg:flex-col lg:items-center lg:gap-3"
            >
              <span className="h-8 w-px bg-[var(--he-line-strong)]" aria-hidden="true" />
              Check a certificate
            </a>
            <a
              href="#verify"
              className="text-xs font-medium text-[var(--he-muted)] underline-offset-4 hover:underline lg:hidden"
            >
              Check a certificate
            </a>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top: copy + illustration */}
            <div className="grid items-start lg:grid-cols-2">
              <div
                className="order-2 flex flex-col self-start lg:order-2 lg:h-[calc(100svh-8rem)] lg:min-h-[36rem]"
              >
                <div
                  id="verify"
                  className="home-editorial-panel relative flex min-h-[20rem] w-full flex-col justify-center px-4 py-7 sm:min-h-[22rem] sm:px-6 sm:py-9 md:px-10 lg:min-h-0 lg:flex-1"
                >
                  <div
                    className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-1.5 sm:right-6 sm:top-6 sm:gap-2 md:right-10 md:top-8"
                    aria-hidden="true"
                  >
                    <BrandMark
                      size={32}
                      priority
                      className="size-8 rounded-md sm:size-9"
                    />
                    <Image
                      src={CLUB_UOM_LOGO_SRC}
                      alt=""
                      width={36}
                      height={36}
                      className="size-8 rounded-full object-cover sm:size-9"
                      priority
                    />
                  </div>
                  <div className="relative w-full sm:pr-[4.75rem] md:pr-[5.25rem]">
                    {children}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  <Link
                    href="/how-it-works"
                    className="home-editorial-tile home-editorial-tile-dark group flex min-h-[4.5rem] flex-col items-center justify-center px-4 py-5 text-center transition-opacity hover:opacity-95 sm:min-h-[6.5rem] sm:py-6"
                  >
                    <span className="text-xs font-medium tracking-wide text-[var(--he-tile-ink)] sm:text-sm">
                      How it works
                    </span>
                    <span
                      className="mt-3 h-px w-8 bg-[var(--he-tile-ink)] opacity-70 transition-all group-hover:w-12"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href="/signup"
                    className="home-editorial-tile home-editorial-tile-mid group flex min-h-[4.5rem] flex-col items-center justify-center px-4 py-5 text-center transition-opacity hover:opacity-95 sm:min-h-[6.5rem] sm:py-6"
                  >
                    <span className="text-xs font-medium tracking-wide text-white sm:text-sm">
                      Create organization
                    </span>
                    <span
                      className="mt-3 h-px w-8 bg-white/70 transition-all group-hover:w-12"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </div>
              <div
                className="order-1 flex w-full flex-col border-b border-[var(--he-line)] bg-[var(--he-surface)] px-0 py-5 sm:px-6 sm:py-6 lg:order-1 lg:h-[calc(100svh-8rem)] lg:min-h-[36rem] lg:border-b-0 lg:px-6 lg:py-6"
              >
                <div className="flex min-h-[13rem] items-center justify-center sm:min-h-[16rem] md:min-h-[20rem] lg:min-h-0 lg:flex-1 lg:[container-type:size]">
                  <HomeVerifyIllustration />
                </div>
                <div
                  className="mt-4 flex w-full shrink-0 flex-col gap-4 px-4 sm:mt-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-0 lg:mt-6 lg:gap-10"
                >
                  <div className="min-w-0 flex-1 sm:pr-1.5">
                    <p className="text-sm font-medium leading-snug text-[var(--he-fg)] sm:text-base md:text-lg">
                      Scan the QR. Trust the registry.
                    </p>
                    <p className="mt-1.5 text-xs leading-snug text-[var(--he-muted)] sm:text-sm">
                      Signed links and live status—no account needed to check.
                    </p>
                  </div>
                  <Link
                    href="/login?mode=signup"
                    className="home-editorial-slide-btn w-full shrink-0 sm:w-auto sm:-ml-1 sm:mr-6 md:mr-7"
                  >
                    <span className="home-editorial-slide-btn__label">Sign up</span>
                    <span className="home-editorial-slide-btn__arrow" aria-hidden="true">
                      <span className="home-editorial-slide-btn__line" />
                      <span className="home-editorial-slide-btn__head" />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}
