import Link from "next/link";
import {
  Building2,
  Database,
  Inbox,
  QrCode,
  Shield,
  UserCheck,
} from "lucide-react";
import { HomeEditorialHero } from "@/components/public/home-editorial";
import { HomeJourneyMark } from "@/components/public/home-journey-mark";
import { HomeFeaturesShowcase } from "@/components/public/home-features-showcase";
import type { HomeQuickPathItem } from "@/components/public/home-quick-path-card";
import { HomeQuickPathsSection } from "@/components/public/home-quick-paths-section";
import type { JourneyCardItem } from "@/components/public/home-journey-illustration-card";
import { VerifyForm } from "@/components/verify/verify-form";

const journey: JourneyCardItem[] = [
  {
    step: "01",
    title: "Design",
    body: "Drag dynamic fields onto high-resolution club templates with the Fabric.js visual designer.",
  },
  {
    step: "02",
    title: "Generate",
    body: "Issue single certificates or import rosters. Every record gets a unique HMAC token and QR code.",
  },
  {
    step: "03",
    title: "Deliver",
    body: "Automated email delivery via Resend sends both the high-res PDF and the permanent check link.",
  },
  {
    step: "04",
    title: "Showcase",
    body: "Recipients add credentials to LinkedIn or publish an opt-in public portfolio of their awards.",
  },
  {
    step: "05",
    title: "Verify",
    body: "Anyone scans the QR to verify authenticity instantly against the live authoritative database.",
  },
];

const trustStrip = [
  {
    icon: Database,
    title: "Live database",
    body: "Every check reads current status from PostgreSQL.",
  },
  {
    icon: Shield,
    title: "HMAC tokens",
    body: "Signed links and QR codes prevent ID-only guessing.",
  },
  {
    icon: UserCheck,
    title: "No account needed",
    body: "Public verification stays open for everyone.",
  },
];

const quickPaths: HomeQuickPathItem[] = [
  {
    href: "/v/LEO-UOM-2026-000123",
    title: "Inspect sample certificate",
    description: "See a sample verification page and seal.",
    icon: UserCheck,
    code: "DEMO-001",
  },
  {
    href: "#verify",
    title: "Scan certificate QR",
    description: "Open the camera scanner on this device.",
    icon: QrCode,
    code: "CAMERA",
  },
  {
    href: "/claim",
    title: "Claim your certificates",
    description: "Get your awards portfolio by email.",
    icon: Inbox,
    code: "CLAIM",
  },
  {
    href: "/signup",
    title: "Issue for your club",
    description: "Sign up your club to issue certificates.",
    icon: Building2,
    code: "NEW CLUB",
  },
];

function JsonLd() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "LeoVerify",
        applicationCategory: "BusinessApplication",
        url: base,
        description:
          "Issue Leo Club certificates and let anyone check them. The site is the record, not the PDF.",
      },
      {
        "@type": "WebSite",
        name: "LeoVerify",
        url: base,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function HomePage() {
  return (
    <div className="home-editorial">
      <JsonLd />

      <HomeEditorialHero>
        <div className="flex w-full min-w-0 flex-col">
          <div className="min-w-0 pr-[3.5rem] sm:pr-[4.75rem]">
            <p className="text-[10px] font-medium leading-snug tracking-wide text-[var(--he-muted)] sm:text-[11px]">
              Leo Club of University of Moratuwa
              <span className="hidden sm:inline"> · </span>
              <span className="block sm:inline">District 306 D2</span>
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--he-fg)] sm:mt-1 sm:text-2xl md:text-3xl">
              Verify credentials with certainty.
            </h2>
          </div>
          <div className="mt-4 w-full sm:mt-6">
            <VerifyForm layout="prompt" variant="editorial" />
          </div>
          <p className="mt-2 text-right text-[10px] text-[var(--he-muted)] sm:mt-3 sm:text-xs">
            Instant check · No sign-in
          </p>
        </div>
      </HomeEditorialHero>

      <div className="flex flex-col gap-12 pb-16 sm:gap-20 sm:pb-24 md:gap-24 md:pb-28">
        <HomeQuickPathsSection items={quickPaths} />

        <section id="features" className="scroll-mt-24 border-t border-[var(--he-line)]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
            <p className="text-xs text-[var(--he-muted)]">System architecture</p>
            <h2 className="mt-3 max-w-2xl text-2xl font-medium tracking-tight text-[var(--he-fg)] sm:text-3xl md:text-4xl">
              From template to live check in five steps
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--he-muted)]">
              Designed for club administrators and recipients to verify
              achievements with complete confidence.
            </p>
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {trustStrip.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="home-editorial-trust-card flex flex-col items-start border border-[var(--he-line)] bg-[var(--he-panel)] px-5 py-7 sm:px-8 sm:py-10"
                  >
                    <Icon
                      className="size-8 text-[var(--he-fg)]"
                      aria-hidden="true"
                      strokeWidth={1.25}
                    />
                    <p className="mt-6 text-base font-medium text-[var(--he-fg)]">
                      {item.title}
                    </p>
                    <span className="mt-3 h-px w-8 bg-[var(--he-line-strong)]" aria-hidden="true" />
                    <p className="mt-3 text-sm leading-relaxed text-[var(--he-muted)]">
                      {item.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
          <HomeFeaturesShowcase items={journey} variant="editorial" />
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="grid overflow-hidden border border-[var(--he-line)] lg:grid-cols-[1fr_16rem]">
            <div className="home-editorial-panel flex flex-col items-start gap-6 px-5 py-10 sm:flex-row sm:items-center sm:gap-8 sm:px-8 sm:py-12 md:px-12 md:py-16">
              <HomeJourneyMark
                step="01"
                className="h-24 w-32 shrink-0 sm:h-32 sm:w-40 md:h-40 md:w-48"
              />
              <div>
                <p className="text-xs text-[var(--he-muted)]">Ready to verify?</p>
                <h2 className="mt-2 max-w-lg text-xl font-medium tracking-tight text-[var(--he-fg)] sm:mt-3 sm:text-2xl md:text-3xl">
                  Issue tamper-proof certificates for your club.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--he-muted)]">
                  Create a custom template, import your member roster, and
                  distribute authenticated credentials.
                </p>
              </div>
            </div>
            <Link
              href="/signup"
              className="home-editorial-tile home-editorial-tile-dark group flex min-h-[5.5rem] flex-row items-center justify-center gap-4 px-6 py-8 text-center transition-opacity hover:opacity-95 sm:min-h-[8rem] lg:min-h-[12rem] lg:flex-col lg:gap-0 lg:px-8 lg:py-12"
            >
              <span className="text-sm font-medium tracking-wide text-white">
                Create organization
              </span>
              <span
                className="mt-3 h-px w-8 bg-white/70 transition-all group-hover:w-12"
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
