"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="site-page-shell flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="site-section-card flex max-w-xl flex-col items-center px-8 py-12 text-center sm:px-12">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
          Something broke on our side. Try again, or go back to the home page.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-sm hover:bg-muted"
          >
            Home
          </Link>
        </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
