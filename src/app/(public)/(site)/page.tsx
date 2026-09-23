import Link from "next/link";
import {
  BadgeCheck,
  LayoutTemplate,
  Mail,
  QrCode,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/public/brand-logo";
import { VerifyForm } from "@/components/verify/verify-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const journey = [
  {
    icon: LayoutTemplate,
    title: "Design",
    body: "Drag fields onto a club template. Start from a gallery or upload your own background.",
  },
  {
    icon: BadgeCheck,
    title: "Generate",
    body: "Issue one certificate or import a roster. Each one gets a check link and a QR code.",
  },
  {
    icon: Mail,
    title: "Send",
    body: "We email the check link and PDF. You do not attach files by hand.",
  },
  {
    icon: Share2,
    title: "Share",
    body: "Recipients share the check link. Preview cards stay private unless the link is valid.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    body: "Anyone can open the link and see if the certificate is still valid.",
  },
];

function MockCertificate() {
  return (
    <div className="relative animate-fade-up-delay-2">
      <div className="absolute -inset-4 rounded-3xl bg-accent/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-float">
        <div className="border-b border-border bg-brand px-6 py-4 text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
            Certificate
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
                LEO-UOM-2026-000123
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Scan to confirm</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-dashed border-accent/60 bg-accent/10">
              <QrCode className="h-8 w-8 text-accent" aria-hidden />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-success-muted/40 px-6 py-3 text-xs font-medium text-success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Anyone can check this. No account needed.
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
      <section className="surface-hero relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="animate-fade-up text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Certificate checks for Leo Clubs
            </p>
            <div className="animate-fade-up mt-4 flex items-center gap-4">
              <BrandMark
                size={64}
                labeled
                priority
                className="rounded-xl shadow-elevated"
              />
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                LeoVerify
              </h1>
            </div>
            <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Make a certificate, email the link, anyone can open it and check.
            </p>
            <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: "brand" }))}
              >
                Sign up
              </Link>
              <a
                href="#verify"
                className={cn(buttonVariants({ variant: "outline" }))}
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
              "Live check",
              "Drag-and-drop designer",
              "CSV and Excel import",
              "Club pages",
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
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            How a certificate gets issued and checked
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Design the template, send the certificate, then anyone can open the
            link.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {journey.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-border bg-background p-5 shadow-elevated"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
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
              Paste the full check link, scan a QR, or enter the ID and token.
            </p>
          </div>
          <Card className="mt-8 max-w-xl">
            <CardHeader>
              <CardTitle>Lookup</CardTitle>
              <CardDescription>
                You need the code from the QR or share link.
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
            Who runs this
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Leo Club of University of Moratuwa
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Leo Club of University of Moratuwa uses this for District 306 A2
            events. They can revoke a certificate and see who issued it.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/about"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              About this site
            </Link>
            <Link href="/signup" className={cn(buttonVariants())}>
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
              Issue your first certificate
            </p>
            <p className="mt-1 text-sm text-white/70">
              Make a template, issue a batch, and put a check page online.
            </p>
          </div>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: "accent" }))}
          >
            Create organization
          </Link>
        </div>
      </section>
    </div>
  );
}
