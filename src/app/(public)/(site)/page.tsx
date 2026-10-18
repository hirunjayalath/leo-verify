import Link from "next/link";
import {
  Building2,
  Database,
  Inbox,
  QrCode,
  Shield,
  UserCheck,
} from "lucide-react";
import { HomeFeaturesShowcase } from "@/components/public/home-features-showcase";
import {
  HomeQuickPathCard,
  type HomeQuickPathItem,
} from "@/components/public/home-quick-path-card";
import type { JourneyCardItem } from "@/components/public/home-journey-illustration-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CredentialMark } from "@/components/ui/credential-mark";
import { VerifyForm } from "@/components/verify/verify-form";
import { cn } from "@/lib/utils";

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

const resourceLinks = [
  { href: "/about", label: "Security whitepaper" },
  { href: "/faq", label: "FAQ" },
  { href: "/how-it-works", label: "Issuing guide" },
  { href: "/login", label: "Admin sign in" },
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
    <div>
      <JsonLd />

      <section className="surface-hero relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <CredentialMark size="md" className="mb-6" />

            <Badge
              variant="accent"
              className="mb-4 normal-case tracking-normal text-xs font-medium"
            >
              Leo Club of University of Moratuwa · District 306 A2
            </Badge>

            <h1 className="display-title text-3xl font-semibold text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              Verify credentials with{" "}
              <span className="text-accent">total certainty.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Live database verification backed by cryptographic HMAC signatures.
              The website is the authentic record, not the static PDF.
            </p>

            <div className="mt-8 w-full max-w-2xl">
              <VerifyForm layout="prompt" />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <div className="mb-3 flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/75">
                Get started with an action below
              </span>
              <span className="text-[11px] text-muted-foreground/60">
                Instant check · No sign-in
              </span>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickPaths.map((item) => (
                <div key={item.title} className="min-w-0">
                  <HomeQuickPathCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-24 border-t border-border/60 bg-muted/20 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="caption-caps text-accent">System architecture</span>
            <h2 className="mt-1 heading-title text-2xl font-semibold text-foreground sm:text-3xl">
              From template to live check in five steps
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Designed for club administrators and recipients to verify
              achievements with complete confidence.
            </p>
          </div>

          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {trustStrip.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/80 px-4 py-3.5 shadow-sm"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10">
            <HomeFeaturesShowcase items={journey} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {resourceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/20 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/80 bg-card p-8 shadow-card sm:flex-row sm:items-center sm:p-10"
          >
            <div>
              <p className="caption-caps text-accent">Ready to verify?</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Issue tamper-proof certificates for your club.
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Create a custom template, import your member roster, and
                distribute authenticated credentials.
              </p>
            </div>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "accent", size: "lg" }),
                "shrink-0",
              )}
            >
              Create organization
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
