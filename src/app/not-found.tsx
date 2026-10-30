import Link from "next/link";
import { BrandMark } from "@/components/public/brand-logo";
import { SiteChrome } from "@/components/public/site-chrome";

export default function NotFound() {
  return (
    <SiteChrome>
      <div className="site-page-shell flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="site-section-card flex max-w-xl flex-col items-center px-8 py-12 text-center sm:px-12">
        <BrandMark size={52} labeled className="rounded-xl bg-white p-1 shadow-elevated" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          That URL is not a LeoVerify page. You can check a certificate or go home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/#verify"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Verify a certificate
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold shadow-sm hover:bg-muted"
          >
            Home
          </Link>
        </div>
        </div>
      </div>
    </SiteChrome>
  );
}
