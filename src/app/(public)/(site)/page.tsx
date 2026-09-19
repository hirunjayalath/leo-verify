import Link from "next/link";
import {
  BadgeCheck,
  LayoutTemplate,
  Mail,
  QrCode,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/brand-logo";
import { VerifyForm } from "@/components/verify-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const journey = [
  {
    icon: LayoutTemplate,
    title: "Design",
    body: "Drag fields onto branded templates. Start from a gallery or upload your own background.",
  },
  {
    icon: BadgeCheck,
    title: "Generate",
    body: "Issue one or bulk-import a roster. Every credential gets a dynamic QR and HMAC token.",
  },
  {
    icon: Mail,
    title: "Send",
    body: "Email recipients verify links and PDFs automatically — no manual attachment work.",
  },
  {
    icon: Share2,
    title: "Share",
    body: "Recipients share LinkedIn-ready verify URLs. Open Graph cards stay token-gated.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Anyone checks authenticity live from the database. The PDF is only a convenience copy.",
  },
];

function MockCertificate() {
  return (
    <div className="relative animate-fade-up-delay-2">
      <div className="absolute -inset-4 rounded-3xl bg-accent/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-float">
        <div className="border-b border-border bg-brand px-6 py-4 text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            Digital credential
          </p>
          <p className="mt-1 text-lg font-semibold">Certificate of Completion</p>
        </div>
        <div className="relative px-6 py-8">
          <BrandMark
            size={64}
            className="pointer-events-none absolute right-4 top-4 opacity-[0.08]"
          />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Presented to
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
            Ada Lovelace
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            for completing{" "}
            <span className="font-medium text-foreground">Leadership Lab</span>
          </p>
          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">
                ORG-ACM-2026-000123
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Live DB record</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-accent/60 bg-accent/10">
              <QrCode className="h-8 w-8 text-brand" aria-hidden />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-success-muted/40 px-6 py-3 text-xs font-medium text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Verifiable anytime — no login wall
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
        "@type": "SoftwareApplication",
        name: "LeoVerify",
        applicationCategory: "BusinessApplication",
        url: base,
        description:
          "Issue and verify digital certificates for clubs and organizations. Live database verification with HMAC-secured QR links.",
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
      <section className="surface-hero relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Certificate maker software
            </p>
            <div className="animate-fade-up mt-4 flex items-center gap-4">
              <BrandMark
                size={64}
                labeled
                priority
                className="rounded-xl shadow-elevated"
              />
              <h1 className="text-4xl font-semibold tracking-tight text-[#323232] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                LeoVerify
              </h1>
            </div>
            <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Design, issue, and verify digital credentials from one place.
              Recipients share login-free verify links — the database record is
              always authoritative.
            </p>
            <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-base font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                Sign up
              </Link>
              <a
                href="#verify"
                className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-card px-6 text-base font-medium text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98]"
              >
                Verify a certificate
              </a>
            </div>
          </div>
          <MockCertificate />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-6">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border/60 pt-8 text-sm text-muted-foreground">
            {[
              "Live DB verification",
              "Drag-and-drop designer",
              "Bulk CSV / Excel import",
              "White-label org portals",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Platform
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            The complete credential journey
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            From design to verification — built for clubs, training orgs, and
            event hosts who need trust at scale.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {journey.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background p-5 shadow-elevated"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-brand">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="verify" className="scroll-mt-24 border-t border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Verify a certificate
            </h2>
            <p className="mt-2 text-muted-foreground">
              Paste the full verify link, scan a QR, or enter ID + token.
            </p>
          </div>
          <Card className="mt-8 max-w-xl">
            <CardHeader>
              <CardTitle>Lookup</CardTitle>
              <CardDescription>
                Requires the unguessable token from the QR or share link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifyForm />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Featured
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Leo Club of University of Moratuwa
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Flagship operator on LeoVerify — issuing verifiable certificates for
            District 306 A2 events, with live revoke and audit trails. Proof that
            the trust model works in production for clubs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/about"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium hover:bg-muted"
            >
              Read the story
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create organization
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-brand text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Get started
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight">
              Issue your first credential today
            </p>
            <p className="mt-1 text-sm text-white/70">
              Design templates, bulk-issue credentials, and publish a verify portal.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-base font-medium text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Create organization
          </Link>
        </div>
      </section>
    </div>
  );
}
