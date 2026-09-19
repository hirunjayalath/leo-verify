import Link from "next/link";
import { BrandMark } from "@/components/public/brand-logo";
import { SiteChrome } from "@/components/public/site-chrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="surface-grid flex flex-1 flex-col items-center justify-center px-4 py-24">
        <BrandMark size={48} labeled className="rounded-xl shadow-elevated" />
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
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
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
