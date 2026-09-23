import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileBadge2 } from "lucide-react";
import { openPublicVerifyAction } from "@/app/(public)/(site)/u/[slug]/actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificateStatus } from "@/generated/prisma/client";
import { prismaService } from "@/lib/db";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipient = await prismaService.recipient.findUnique({ where: { slug } });
  if (!recipient?.publicProfile) notFound();
  return {
    title: recipient.name ?? "Recipient",
    description: "Public LeoVerify certificate profile",
    robots: { index: false, follow: false },
    openGraph: {
      title: `${recipient.name ?? "Recipient"} certificates`,
      description: "Certificates on LeoVerify",
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
    include: {
      certificates: {
        where: {
          status: CertificateStatus.issued,
          unlisted: false,
        },
        include: {
          event: { include: { club: true } },
        },
        orderBy: { issueDate: "desc" },
      },
    },
  });

  if (!recipient || !recipient.publicProfile) {
    notFound();
  }

  const name = recipient.name ?? "LeoVerify recipient";

  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Back to home
          </Link>
        </p>
        <div className="flex items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-accent shadow-elevated"
            aria-hidden
          >
            {initials(recipient.name)}
          </span>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Public profile
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">
              {name}
            </h1>
            <p className="mt-2 text-muted-foreground">
              This person chose to list certificates here. You can still check
              one certificate from the QR without a profile.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Certificates</h2>
            <p className="text-sm text-muted-foreground">
              {recipient.certificates.length === 0
                ? "None listed"
                : `${recipient.certificates.length} visible`}
            </p>
          </div>

          {recipient.certificates.length === 0 ? (
            <EmptyState
              icon={FileBadge2}
              title="No public certificates listed"
              description="When this person lists issued certificates, they show up here."
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {recipient.certificates.map((cert) => (
                <li
                  key={cert.id}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-elevated"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug text-foreground">
                      {cert.event.name}
                    </p>
                    <Badge variant="success">Valid</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {cert.role}
                    {cert.achievement ? ` · ${cert.achievement}` : ""}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {cert.event.club.name}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {cert.issueDate.toISOString().slice(0, 10)}
                  </p>
                  <form action={openPublicVerifyAction} className="mt-4">
                    <input type="hidden" name="uniqueId" value={cert.uniqueId} />
                    <button
                      type="submit"
                      className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand px-3 text-sm font-medium text-brand-foreground hover:opacity-90"
                    >
                      Verify
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
