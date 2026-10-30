"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/public/brand-logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#features", label: "Features", match: null },
  { href: "/#verify", label: "Verify", match: null },
  { href: "/login", label: "Login", match: "/login" },
  { href: "/login?mode=signup", label: "Sign up", match: null },
];

export function HomeEditorialHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="home-editorial-header sticky top-0 z-40 border-b border-[var(--he-line)] bg-[var(--he-surface)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link href="/" className="inline-flex min-w-0 shrink">
          <BrandLockup
            size={26}
            priority
            wordmarkClassName="text-sm font-medium text-[var(--he-fg)] sm:text-base"
          />
        </Link>

        <div className="hidden items-center gap-4 md:flex lg:gap-6">
          <nav
            className="flex items-center gap-3 text-sm lg:gap-5"
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
                    "transition-colors",
                    active
                      ? "text-[var(--he-fg)]"
                      : "text-[var(--he-muted)] hover:text-[var(--he-fg)]",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/signup"
            className="home-editorial-primary-link hidden rounded-full px-4 py-2.5 text-xs font-semibold transition-transform hover:-translate-y-0.5 lg:inline-flex"
          >
            Create organization
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--he-line-strong)] text-[var(--he-fg)]"
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
          "border-t border-[var(--he-line)] bg-[var(--he-surface)] md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="flex w-full flex-col px-4 py-3" aria-label="Mobile">
          {links.map((link) => {
            const active = link.match ? pathname.startsWith(link.match) : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-1 py-2.5 text-sm",
                  active ? "text-[var(--he-fg)]" : "text-[var(--he-muted)]",
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/signup"
            className="home-editorial-primary-link mt-2 rounded-full px-4 py-2.5 text-center text-sm font-semibold"
            onClick={() => setOpen(false)}
          >
            Create organization
          </Link>
        </nav>
      </div>
    </header>
  );
}
