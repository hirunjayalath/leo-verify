import Link from "next/link";
import {
  Archive,
  BadgeCheck,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { VerifyForm } from "@/components/verify-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const pillars = [
  {
    icon: QrCode,
    title: "Instant QR verification",
    body: "Every certificate carries a unique ID and QR that opens a live public record.",
  },
  {
    icon: BadgeCheck,
    title: "Automated generation",
    body: "Upload a roster once. The system stamps each name onto your template and produces PDFs.",
  },
  {
    icon: Archive,
    title: "Permanent archive",
    body: "Records outlive board turnovers — nothing lives only on someone's laptop.",
  },
  {
    icon: Search,
    title: "Public re-download",
    body: "Recipients who lose a file can find and download it again without messaging anyone.",
  },
];

const steps = [
  {
    n: "01",
    title: "Issue",
    body: "Club admins design a template and issue certificates from a roster.",
  },
  {
    n: "02",
    title: "Share QR",
    body: "Each PDF embeds an unguessable verification link as a QR code.",
  },
  {
    n: "03",
    title: "Verify live",
    body: "Anyone opens the link and sees the authoritative database record.",
  },
];

const faqTeasers = [
  {
    q: "What is a verification token?",
    a: "A secret from the QR or share link. The ID alone is not enough to look up a certificate.",
  },
  {
    q: "What if it says revoked?",
    a: "The club marked it invalid. The public page shows only that it has been revoked.",
  },
  {
    q: "Lost your PDF?",
    a: "Open the original verify link. If still issued, download the PDF from the verify page.",
  },
];

function MockCertificate() {
  return (
    <div className="relative animate-fade-up-delay-2">
      <div className="absolute -inset-4 rounded-3xl bg-accent/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-float">
        <div className="border-b border-border bg-brand px-6 py-4 text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            Leo Club certificate
          </p>
          <p className="mt-1 text-lg font-semibold">Certificate of Appreciation</p>
        </div>
        <div className="relative px-6 py-8">
          <div
            className="pointer-events-none absolute right-4 top-4 text-6xl font-bold text-primary/4"
            aria-hidden
          >
            LV
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Presented to
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
            Ada Lovelace
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            for outstanding service as{" "}
            <span className="font-medium text-foreground">Volunteer</span>
          </p>
          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">
                LEO-UOM-2026-000123
              </p>
              <p className="mt-1 text-xs text-muted-foreground">15 Mar 2026</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-accent/60 bg-accent/10">
              <QrCode className="h-8 w-8 text-brand" aria-hidden />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-success-muted/40 px-6 py-3 text-xs font-medium text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Live verification available
        </div>
      </div>
    </div>
  );
}

function JsonLd() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "LeoVerify",
        url: base,
        description:
          "Credentialing platform for Leo Club certificates. Operated by Leo Club of University of Moratuwa.",
        parentOrganization: {
          "@type": "Organization",
          name: "Leo Club of University of Moratuwa",
        },
      },
      {
        "@type": "WebSite",
        name: "LeoVerify",
        url: base,
        potentialAction: {
          "@type": "SearchAction",
          target: `${base}/#verify`,
          "query-input": "required name=certificate_id",
        },
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
      <section className="surface-hero relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground dark:text-accent">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Credentialing for Leo Clubs
            </p>
            <h1 className="animate-fade-up-delay-1 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              LeoVerify
              <span className="mt-2 block h-1 w-16 rounded-full bg-accent" aria-hidden />
            </h1>
            <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Issue signed certificates your community can trust. Anyone can check a
              record independently of the PDF — no login required.
            </p>
            <p className="animate-fade-up-delay-2 mt-3 text-sm text-muted-foreground">
              Operated by Leo Club of University of Moratuwa · District 306 A2
            </p>
            <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
              <a
                href="#verify"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
              >
                Verify a certificate
              </a>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-base font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98]"
              >
                Club admin login
              </Link>
            </div>
          </div>
          <MockCertificate />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-8 text-sm text-muted-foreground">
            {[
              "Live DB verification",
              "Unguessable QR tokens",
              "Attributed audit trail",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="verify" className="scroll-mt-24 border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Verify a certificate
            </h2>
            <p className="mt-2 text-muted-foreground">
              Enter the ID from the certificate, or open the link / QR code directly.
            </p>
          </div>
          <Card className="mt-8 max-w-xl">
            <CardHeader>
              <CardTitle>Lookup</CardTitle>
              <CardDescription>
                Requires the unguessable token from the QR or share link. Paste the
                full link from the QR if you have it — or enter ID and token below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifyForm />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Three steps to trust
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.n}
                className="rounded-xl border border-border bg-card p-6 shadow-elevated transition-transform hover:-translate-y-0.5"
              >
                <p className="font-mono text-sm font-semibold text-accent">{step.n}</p>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            <Link
              href="/how-it-works"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Read the full walkthrough
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="group space-y-3 rounded-xl p-2 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/5 text-brand transition-colors group-hover:bg-accent/20 dark:text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {pillar.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pillar.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                FAQ
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Common questions
              </h2>
            </div>
            <Link
              href="/faq"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View all FAQ
            </Link>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {faqTeasers.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-border bg-card p-6 shadow-elevated"
              >
                <h3 className="font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Built for
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              Leo Club of University of Moratuwa · District 306 A2
            </p>
            <p className="mt-1 text-sm text-white/70">
              Designed to scale to every Leo club in Sri Lanka.
            </p>
          </div>
          <Link
            href="/about"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            About LeoVerify
          </Link>
        </div>
      </section>
    </div>
  );
}
