"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLockup } from "@/components/public/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/#features", label: "Features", match: null },
  { href: "/#verify", label: "Verify", match: null },
  { href: "/login", label: "Login", match: "/login" },
];
function SiteHeaderInner({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLockup size={32} priority />
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          {links.map((link) => {
            const active = link.match ? pathname.startsWith(link.match) : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative rounded-md px-3 py-2 transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-accent transition-transform",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
          <ThemeToggle className="ml-1" />
          <Link
            href="/signup"
            className="ml-1 inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign up
          </Link>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-border bg-card md:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3" aria-label="Mobile">
          {links.map((link) => {
            const active = link.match ? pathname.startsWith(link.match) : false;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm hover:bg-muted",
                  active ? "bg-muted font-medium" : "text-muted-foreground",
                )}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/signup"
            className="mt-1 rounded-full bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
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
