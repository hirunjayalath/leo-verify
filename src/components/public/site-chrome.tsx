"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/public/brand-logo";
import { HomeEditorialFooter } from "@/components/public/home-editorial-footer";
import { HomeEditorialHeader } from "@/components/public/home-editorial-header";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { cn } from "@/lib/utils";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const editorialHome = pathname === "/";

  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col",
        editorialHome && "home-editorial-page",
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
      >
        Skip to content
      </a>
      {editorialHome ? <HomeEditorialHeader /> : <SiteHeader />}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {editorialHome ? <HomeEditorialFooter /> : <SiteFooter />}
    </div>
  );
}

export function BrandHomeLink() {
  return (
    <Link href="/" className="inline-flex">
      <BrandLockup size={32} />
    </Link>
  );
}
