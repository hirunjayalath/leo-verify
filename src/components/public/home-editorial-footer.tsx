import Image from "next/image";
import Link from "next/link";
import { BrandLockup } from "@/components/public/brand-logo";
import { HomeEditorialClubLogos } from "@/components/public/home-editorial-club-logos";
import { cn } from "@/lib/utils";

const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@leoverify.org";

const KNURDZ_URL = "https://knurdz.com";
const POWERED_BY_KNURDZ_SRC = "/powered-by-knurdz.png";

const siteLinks = [
  { href: "/#verify", label: "Verify a certificate" },
  { href: "/#features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/signup", label: "Create organization" },
];

const resourceLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
];

function FooterNavColumn({
  title,
  links,
  className,
}: {
  title: string;
  links: { href: string; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-4 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14",
        className,
      )}
    >
      <p className="text-[11px] font-medium tracking-wide text-[var(--he-muted)]">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group inline-flex items-center gap-2 text-sm text-[var(--he-fg)] transition-colors hover:text-[var(--he-muted)]"
            >
              <span
                className="h-px w-0 bg-[var(--he-line-strong)] transition-all group-hover:w-3"
                aria-hidden="true"
              />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeEditorialFooter() {
  return (
    <footer className="w-full border-t border-[var(--he-line)] bg-[var(--he-surface)]">
      <div className="grid w-full border-b border-[var(--he-line)] lg:grid-cols-12">
        <div
          className="border-b border-[var(--he-line)] px-6 py-10 sm:px-10 sm:py-12 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-12 lg:py-14"
        >
            <Link href="/" className="inline-flex">
              <BrandLockup
                size={28}
                wordmarkClassName="text-base font-medium text-[var(--he-fg)]"
              />
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--he-muted)]">
              Issue and check Leo Club credentials against a live registry. The
              link and QR are the proof—not the PDF file.
            </p>

            <p className="mt-6 text-[11px] font-medium leading-relaxed tracking-wide text-[var(--he-muted)]">
              Leo Club of University of Moratuwa
              <br />
              District 306 A2 · Sri Lanka
            </p>
          </div>

          <FooterNavColumn
            title="Product"
            links={siteLinks}
            className="border-b border-[var(--he-line)] lg:col-span-3 lg:border-b-0 lg:border-r"
          />

          <div className="lg:col-span-4">
            <FooterNavColumn title="Resources" links={resourceLinks} />
            <div className="border-t border-[var(--he-line)] px-6 pb-10 pt-8 sm:px-10 sm:pb-12 sm:pt-10 lg:px-12 lg:pb-14">
              <p className="text-[11px] font-medium tracking-wide text-[var(--he-muted)]">
                Contact
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="mt-3 inline-block text-sm text-[var(--he-fg)] underline-offset-4 transition-colors hover:text-[var(--he-muted)] hover:underline"
              >
                {supportEmail}
              </a>
            </div>
          </div>
        </div>

      <div
        className="home-editorial-tile-dark flex w-full flex-col gap-5 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-6 lg:px-12"
      >
          <p
            className="home-editorial-footer-copy text-[11px] leading-relaxed text-white/55"
            suppressHydrationWarning
          >
            © {new Date().getFullYear()} LeoVerify. Operated by Leo Club of
            University of Moratuwa.
          </p>

          <div
            className="flex flex-wrap items-center gap-4 self-start sm:gap-5 sm:self-center"
          >
            <HomeEditorialClubLogos size="sm" />
            <span
              className="hidden h-6 w-px bg-white/20 sm:block"
              aria-hidden="true"
            />
            <a
              href={KNURDZ_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 transition-opacity hover:opacity-85"
            >
              <Image
                src={POWERED_BY_KNURDZ_SRC}
                alt="Powered by Knurdz"
                width={200}
                height={48}
                className="h-8 w-auto sm:h-9"
              />
            </a>
          </div>
      </div>
    </footer>
  );
}
