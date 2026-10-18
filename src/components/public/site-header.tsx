"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/public/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#features", label: "Features", match: null },
  { href: "/#verify", label: "Verify", match: null },
  { href: "/login", label: "Login", match: "/login" },
];
function SiteHeaderInner({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <BrandLockup size={30} priority />
        </Link>

        {/* Right side navigation and actions */}
        <div className="hidden items-center gap-2 md:flex">
          <nav
            className="flex items-center gap-1 rounded-full border border-border/70 bg-card/80 p-1 text-xs font-medium shadow-sm backdrop-blur-md"
            aria-label="Main"
          >
            {links.map((link) => {
              const active = link.match ? pathname.startsWith(link.match) : false;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 transition-all duration-150",
                    active
                      ? "bg-foreground text-background font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 pl-1">
            <ThemeToggle className="h-8 w-8" />
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: "accent", size: "sm" }))}
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/70 text-foreground shadow-sm backdrop-blur-md transition-all hover:bg-muted active:scale-95"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-b border-border/60 bg-card/95 backdrop-blur-2xl transition-all duration-200 md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav
          className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3"
          aria-label="Mobile"
        >
          {links.map((link) => {
            const active = link.match ? pathname.startsWith(link.match) : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "accent", size: "default" }),
              "mt-2 w-full",
            )}
            onClick={() => setOpen(false)}
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  return <SiteHeaderInner pathname={pathname} />;
}
