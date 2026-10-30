import Link from "next/link";
import { BrandLockup } from "@/components/public/brand-logo";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@leoverify.org";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-[#08182e] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <BrandLockup size={34} wordmarkClassName="text-white" markClassName="bg-white p-1" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            The verification URL is the ground truth. Cryptographic HMAC check
            tokens ensure zero credential tampering.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Database Authoritative · Live Verification</span>
          </div>
          <p className="mt-4 text-xs text-white/45">
            Operated by Leo Club of University of Moratuwa · District 306 D2
          </p>
        </div>
        <div>
          <p className="caption-caps text-[#ffc72c]">
            Product
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/#features" className="text-white/60 transition-colors hover:text-white">
                Features & Security
              </Link>
            </li>
            <li>
              <Link href="/#verify" className="text-white/60 transition-colors hover:text-white">
                Instant Lookup
              </Link>
            </li>
            <li>
              <Link href="/signup" className="text-white/60 transition-colors hover:text-white">
                Organization Access
              </Link>
            </li>
            <li>
              <Link href="/claim" className="text-white/60 transition-colors hover:text-white">
                Claim Certificates
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="caption-caps text-[#ffc72c]">
            Organization
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/about" className="text-white/60 transition-colors hover:text-white">
                About LeoVerify
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-white/60 transition-colors hover:text-white">
                Frequently Asked
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-white/60 transition-colors hover:text-white">
                Admin Console
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${supportEmail}`}
                className="text-white/60 transition-colors hover:text-white"
              >
                {supportEmail}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p suppressHydrationWarning>© {new Date().getFullYear()} LeoVerify. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Built with precision for Leo Clubs in Sri Lanka</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
