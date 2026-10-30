import Link from "next/link";
import type { ComponentProps } from "react";
import { ShieldCheck } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/public/brand-logo";
import { HomeLoginIllustration } from "@/components/public/home-login-illustration";
import { HomeRegisterIllustration } from "@/components/public/home-register-illustration";
import { HomeVerifyIllustration } from "@/components/public/home-verify-illustration";
import { cn } from "@/lib/utils";

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
    <div className="home-editorial site-page-shell w-full flex-1">
      <section
        className="border-b border-[var(--he-line)]"
        aria-labelledby="auth-shell-title"
      >
        <div className="flex w-full flex-col lg:flex-row">
          <div
            className="flex flex-row items-center justify-between gap-4 border-b border-[var(--he-line)] bg-[var(--he-surface)] px-4 py-3 lg:hidden"
          >
            <Link
              href="/"
              className="inline-flex shrink-0 transition-opacity hover:opacity-80"
              aria-label="LeoVerify home"
            >
              <BrandLockup size={30} wordmarkClassName="text-[var(--he-fg)]" />
            </Link>
            <p className="text-xs font-medium text-[var(--he-muted)]">{asideLabel}</p>
          </div>

          <div
            className="hidden shrink-0 flex-col items-center justify-between border-b border-white/10 bg-[#07182f] px-0 py-8 text-white lg:flex lg:w-16 lg:border-b-0 lg:border-r"
          >
            <Link
              href="/"
              className="inline-flex rounded-xl bg-white p-1.5 shadow-lg transition-transform hover:scale-105"
              aria-label="LeoVerify home"
            >
              <BrandMark size={30} />
            </Link>
            <p
              className="rotate-180 text-[10px] font-semibold tracking-[0.22em] text-white/55 [writing-mode:vertical-rl]"
            >
              {asideLabel}
            </p>
            <span className="h-10 w-1 rounded-full bg-[#ffc72c]" aria-hidden="true" />
          </div>

          <div
            className="grid min-w-0 flex-1 lg:grid-cols-2 lg:min-h-[min(40rem,calc(100svh-9rem))]"
          >
            <div
              className="order-2 flex flex-col items-center border-b border-[var(--he-line)] bg-[linear-gradient(155deg,#eaf2fd_0%,#f8fbff_58%,#fff8da_100%)] px-4 py-6 sm:px-6 sm:py-8 lg:order-1 lg:items-stretch lg:border-b-0 lg:border-r lg:py-12 dark:bg-[linear-gradient(155deg,#0b1b31_0%,#0d1629_60%,#2a250f_100%)]"
            >
              <div
                className="flex w-full min-h-[8rem] items-center justify-center sm:min-h-[10rem] md:min-h-[12rem] lg:min-h-0 lg:flex-1 lg:[container-type:size]"
              >
                <div className="rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-[0_28px_70px_-42px_rgba(12,35,64,0.65)] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
                  <AsideIllustration
                    className="max-w-[min(100%,14rem)] sm:max-w-[16rem] lg:max-w-sm"
                  />
                </div>
              </div>
              <div className="mt-3 hidden max-w-[16rem] items-start gap-3 rounded-2xl border border-[var(--he-line)] bg-white/55 p-4 text-[11px] leading-relaxed text-[var(--he-muted)] backdrop-blur-sm lg:mt-6 lg:flex lg:max-w-sm dark:bg-white/[0.04]">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1e40af] dark:text-[#ffc72c]" aria-hidden="true" />
                <p>Sign in to issue or claim certificates. Public verification needs no account.</p>
              </div>
            </div>

            <div
              className="order-1 flex min-h-[28rem] flex-col justify-center bg-[var(--he-surface)] px-4 py-8 sm:min-h-[30rem] sm:px-6 sm:py-12 md:px-10 md:py-14 lg:order-2 lg:min-h-0 lg:px-12 lg:py-16"
            >
              <div className="mx-auto w-full max-w-md">
                <p className="inline-flex w-fit items-center rounded-full border border-[var(--he-line)] bg-[var(--he-panel)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--he-muted)]">
                  Secure account access
                </p>
                <h1
                  id="auth-shell-title"
                  className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--he-fg)] sm:text-3xl md:text-4xl"
                >
                  {title}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-[var(--he-muted)] sm:mt-3">
                  {description}
                </p>

                <div
                  className={cn(
                    "auth-editorial-card mt-6 rounded-2xl border border-[var(--he-line)] bg-[var(--he-surface)] p-4 shadow-[0_24px_60px_-42px_rgba(12,35,64,0.5)] sm:mt-8 sm:p-6 md:p-7",
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
  "auth-editorial-submit inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--he-tile-ink)] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45";

export const authEditorialFieldClass = "auth-editorial-field";
