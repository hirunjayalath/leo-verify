import Link from "next/link";
import type { ComponentProps } from "react";
import { HomeLoginIllustration } from "@/components/public/home-login-illustration";
import { HomeRegisterIllustration } from "@/components/public/home-register-illustration";
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

export function AuthShell({
  title,
  description,
  children,
  asideLabel = "Account access",
  illustration = "register",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  asideLabel?: string;
  illustration?: "verify" | "register" | "login";
}) {
  const AsideIllustration =
    illustration === "login"
      ? HomeLoginIllustration
      : illustration === "register"
        ? HomeRegisterIllustration
        : HomeVerifyIllustration;

  return (
    <div className="home-editorial w-full flex-1">
      <section
        className="border-b border-[var(--he-line)]"
        aria-labelledby="auth-shell-title"
      >
        <div className="flex w-full flex-col lg:flex-row">
          <div
            className="home-editorial-panel flex flex-row items-center justify-between gap-4 border-b border-[var(--he-line)] px-4 py-3 lg:hidden"
          >
            <Link
              href="/"
              className="inline-flex shrink-0 p-1 transition-opacity hover:opacity-70"
              aria-label="LeoVerify home"
            >
              <GridMark />
            </Link>
            <p className="text-xs font-medium text-[var(--he-muted)]">{asideLabel}</p>
          </div>

          <div
            className="home-editorial-panel hidden shrink-0 flex-col items-center justify-between border-b border-[var(--he-line)] px-0 py-8 lg:flex lg:w-14 lg:border-b-0 lg:border-r"
          >
            <Link
              href="/"
              className="inline-flex p-1 transition-opacity hover:opacity-70"
              aria-label="LeoVerify home"
            >
              <GridMark />
            </Link>
            <p
              className="text-[10px] font-medium tracking-[0.2em] text-[var(--he-muted)] [writing-mode:vertical-rl] rotate-180"
            >
              {asideLabel}
            </p>
            <span className="h-8 w-px bg-[var(--he-line-strong)]" aria-hidden="true" />
          </div>

          <div
            className="grid min-w-0 flex-1 lg:grid-cols-2 lg:min-h-[min(40rem,calc(100svh-9rem))]"
          >
            <div
              className="order-2 flex flex-col items-center border-b border-[var(--he-line)] bg-[var(--he-surface)] px-4 py-6 sm:px-6 sm:py-8 lg:order-1 lg:items-stretch lg:border-b-0 lg:border-r lg:py-12"
            >
              <div
                className="flex w-full min-h-[8rem] items-center justify-center sm:min-h-[10rem] md:min-h-[12rem] lg:min-h-0 lg:flex-1 lg:[container-type:size]"
              >
                <AsideIllustration
                  className="max-w-[min(100%,14rem)] sm:max-w-[16rem] lg:max-w-sm"
                />
              </div>
              <p
                className="mt-3 hidden max-w-[16rem] text-center text-[11px] leading-relaxed text-[var(--he-muted)] lg:mt-6 lg:block lg:max-w-xs lg:border-t lg:border-[var(--he-line)] lg:pt-5 lg:text-left"
              >
                Sign in to issue or claim certificates. Public verification
                needs no account.
              </p>
            </div>

            <div
              className="home-editorial-panel order-1 flex min-h-[28rem] flex-col justify-center px-4 py-8 sm:min-h-[30rem] sm:px-6 sm:py-12 md:px-10 md:py-14 lg:order-2 lg:min-h-0 lg:px-12 lg:py-16"
            >
              <div className="mx-auto w-full max-w-md">
                <p className="text-[11px] font-medium tracking-wide text-[var(--he-muted)]">
                  LeoVerify
                </p>
                <h1
                  id="auth-shell-title"
                  className="mt-2 text-xl font-semibold tracking-tight text-[var(--he-fg)] sm:text-2xl md:text-3xl"
                >
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[var(--he-muted)] sm:mt-3">
                  {description}
                </p>

                <div
                  className={cn(
                    "auth-editorial-card mt-6 border border-[var(--he-line)] bg-[var(--he-surface)] p-4 sm:mt-8 sm:p-6 md:p-8",
                  )}
                >
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AuthShellFootnote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "auth-editorial-footnote mt-4 text-center text-xs leading-relaxed text-[var(--he-muted)] sm:mt-5 sm:text-sm",
        className,
      )}
    >
      {children}
    </p>
  );
}

const authInlineActionClass =
  "font-medium text-[var(--he-fg)] underline-offset-4 transition-colors hover:text-[var(--he-muted)] hover:underline disabled:opacity-50";

export function AuthShellLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link className={cn(authInlineActionClass, className)} {...props}>
      {children}
    </Link>
  );
}

export function AuthShellInlineButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(authInlineActionClass, className)}
      {...props}
    />
  );
}

export const authEditorialSubmitClass =
  "auth-editorial-submit inline-flex h-11 w-full items-center justify-center gap-2 text-sm font-medium text-[var(--he-tile-ink)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45";

export const authEditorialFieldClass = "auth-editorial-field";
