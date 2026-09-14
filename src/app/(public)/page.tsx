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

function MockCertificate() {
  return (
    <div className="relative animate-fade-up-delay-2">
      <div className="absolute -inset-4 rounded-3xl bg-accent/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-float">
        <div className="border-b border-border bg-[#0b1f3a] px-6 py-4 text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            Leo Club certificate
          </p>
          <p className="mt-1 text-lg font-semibold">Certificate of Appreciation</p>
        </div>
        <div className="relative px-6 py-8">
          <div
            className="pointer-events-none absolute right-4 top-4 text-6xl font-bold text-primary/[0.04]"
            aria-hidden
          >
            LV
          </div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Presented to
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold tracking-tight text-foreground">
            Ada Lovelace
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            for outstanding service as <span className="font-medium text-foreground">Volunteer</span>
          </p>
          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">
                LEO-UOM-2026-000123
              </p>
              <p className="mt-1 text-xs text-muted-foreground">15 Mar 2026</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-accent/60 bg-accent/10">
              <QrCode className="h-8 w-8 text-[#0b1f3a] dark:text-accent" aria-hidden />
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

export default function HomePage() {
  return (
    <div>
      <section className="surface-hero relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="animate-fade-up mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-[#0b1f3a] dark:text-accent">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Credentialing for Leo Clubs
            </p>
            <h1 className="animate-fade-up-delay-1 text-4xl font-semibold tracking-tight text-[#0b1f3a] dark:text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              LeoVerify
              <span className="mt-2 block h-1 w-16 rounded-full bg-accent" aria-hidden />
            </h1>
            <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Issue signed certificates your community can trust. Anyone can check a
              record independently of the PDF — no login required.
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
                Requires the unguessable token from the QR or share link.
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
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/5 text-[#0b1f3a] transition-colors group-hover:bg-accent/20 group-hover:text-[#0b1f3a] dark:text-accent">
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

      <section className="border-t border-border bg-[#0b1f3a] text-white">
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
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 text-base font-medium text-accent-foreground shadow-sm transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Start for your club
          </Link>
        </div>
      </section>
    </div>
  );
}
