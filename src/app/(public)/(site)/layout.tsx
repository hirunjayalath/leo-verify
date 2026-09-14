import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-accent">
                LV
              </span>
              <span className="text-lg font-semibold tracking-tight">LeoVerify</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              The certificate PDF is a convenience copy. The database record is
              the only thing that is ever authoritative.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/#verify" className="hover:text-foreground">
                  Verify
                </Link>
              </li>
              <li>
                <Link href="/claim" className="hover:text-foreground">
                  Claim certificates
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-foreground">
                  Organization signup
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Club
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Club admin login
                </Link>
              </li>
              <li className="text-muted-foreground">
                Leo Club of University of Moratuwa
              </li>
              <li className="text-muted-foreground">District 306 A2</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} LeoVerify</p>
            <p>Built for Leo Clubs in Sri Lanka</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
