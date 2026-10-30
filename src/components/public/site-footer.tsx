import Link from "next/link";
import { BrandLockup } from "@/components/public/brand-logo";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@leoverify.org";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card/60 backdrop-blur-md">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <BrandLockup size={32} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The verification URL is the ground truth. Cryptographic HMAC check
            tokens ensure zero credential tampering.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Database Authoritative · Live Verification</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Operated by Leo Club of University of Moratuwa · District 306 D2
          </p>
        </div>
        <div>
          <p className="caption-caps text-muted-foreground">
            Product
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/#features" className="text-muted-foreground transition-colors hover:text-foreground">
                Features & Security
              </Link>
            </li>
            <li>
              <Link href="/#verify" className="text-muted-foreground transition-colors hover:text-foreground">
                Instant Lookup
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
                Organization Access
              </Link>
            </li>
            <li>
              <Link href="/claim" className="text-muted-foreground transition-colors hover:text-foreground">
                Claim Certificates
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="caption-caps text-muted-foreground">
            Organization
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/about" className="text-muted-foreground transition-colors hover:text-foreground">
                About LeoVerify
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-muted-foreground transition-colors hover:text-foreground">
                Frequently Asked
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
                Admin Console
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${supportEmail}`}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {supportEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="site-footer-bar border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p suppressHydrationWarning>© {new Date().getFullYear()} LeoVerify. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Built with precision for Leo Clubs in Sri Lanka</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
