import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileBadge2 } from "lucide-react";
import { openPublicVerifyAction } from "@/app/(public)/(site)/u/[slug]/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificateStatus } from "@/generated/prisma/client";
import { prismaService } from "@/lib/db";
import { cn } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipient = await prismaService.recipient.findUnique({ where: { slug } });
  if (!recipient?.publicProfile) notFound();
  const title = `${recipient.name ?? "Recipient"} certificates`;
  const description = "Certificates on LeoVerify";
  const ogImagePath = `/api/og/profile/${encodeURIComponent(slug)}`;
  return {
    title: recipient.name ?? "Recipient",
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      images: [{ url: ogImagePath, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

function initials(name: string | null | undefined) {
  if (!name) return "LV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const recipient = await prismaService.recipient.findUnique({
    where: { slug },
    select: {
      name: true,
      publicProfile: true,
      certificates: {
        where: {
          status: CertificateStatus.issued,
          unlisted: false,
        },
        select: {
          id: true,
          uniqueId: true,
          role: true,
          achievement: true,
          issueDate: true,
          status: true,
          event: {
            select: {
              name: true,
              club: { select: { name: true } },
            },
          },
        },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!recipient || !recipient.publicProfile) {
    notFound();
  }

  const name = recipient.name ?? "LeoVerify recipient";
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const shareUrl = `${appUrl}/u/${encodeURIComponent(slug)}`;

  return (
    <div className="site-page-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </p>

        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,#0c2340_0%,#164194_72%,#1e40af_100%)] p-6 text-white shadow-lg sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border-[42px] border-white/[0.05]" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <span
              className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#ffc72c] text-xl font-bold text-[#0c2340] shadow-lg"
              aria-hidden
            >
              {initials(recipient.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="caption-caps text-[#ffd95e]">
                  Verified Recipient Portfolio
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white/85">
                  Public Profile Active
                </span>
              </div>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-[-0.025em] text-white sm:text-4xl">
                {name}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-white/65 sm:text-sm">
                Authentic certifications issued by Leo Clubs in Sri Lanka,
                verified live against the central cryptographic database.
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ size: "sm", variant: "accent" }), "shadow-sm")}
                >
                  Share Portfolio on LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Certificates Grid */}
        <div className="mt-10">
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Earned Credentials
              </h2>
              <p className="text-xs text-muted-foreground">
                Click any credential to inspect the live authoritative record.
              </p>
            </div>
            <span className="rounded-full border border-border/70 bg-muted/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {recipient.certificates.length === 0
                ? "0 records"
                : `${recipient.certificates.length} verified`}
            </span>
          </div>

          {recipient.certificates.length === 0 ? (
            <EmptyState
              icon={FileBadge2}
              title="No public certificates listed"
              description="When this person lists issued certificates, they show up here."
            />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2">
              {recipient.certificates.map((cert) => (
                <li
                  key={cert.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/10 bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-base leading-snug text-foreground">
                        {cert.event.name}
                      </p>
                      <Badge variant="success" className="shrink-0">
                        Valid
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground/90 font-medium">
                      {cert.role}
                      {cert.achievement ? ` · ${cert.achievement}` : ""}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {cert.event.club.name}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      Issued {cert.issueDate.toISOString().slice(0, 10)}
                    </p>
                  </div>

                  <form action={openPublicVerifyAction} className="mt-6">
                    <input type="hidden" name="uniqueId" value={cert.uniqueId} />
                    <button
                      type="submit"
                      className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                      Verify Record
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
