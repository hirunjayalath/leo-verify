import Link from "next/link";
import { SiteChrome } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="surface-grid flex flex-1 flex-col items-center justify-center px-4 py-24">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-accent">
          LV
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          That URL does not match a LeoVerify page. You can verify a certificate or
          return home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#verify"
            className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground shadow-sm hover:bg-accent/90"
          >
            Verify a certificate
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium shadow-sm hover:bg-muted"
          >
            Home
          </Link>
        </div>
      </div>
    </SiteChrome>
  );
}
