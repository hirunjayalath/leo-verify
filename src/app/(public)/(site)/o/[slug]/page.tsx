import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileBadge2 } from "lucide-react";
import { openPublicVerifyAction } from "@/app/(public)/(site)/u/[slug]/actions";
import { VerifyForm } from "@/components/verify/verify-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificateStatus } from "@/generated/prisma/client";
import { getCachedClubBrandingBySlug } from "@/lib/cache/safe-cache";
import { prismaService } from "@/lib/db";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const club = await getCachedClubBrandingBySlug(slug);
  if (!club) notFound();
  return {
    title: club.name,
    description: club.tagline ?? `${club.name} certificates on LeoVerify`,
    robots: { index: true, follow: true },
  };
}

export default async function OrgPortalPage({ params }: PageProps) {
  const { slug } = await params;
  const club = await getCachedClubBrandingBySlug(slug);
  if (!club) notFound();

  const [issuedCount, publicCerts] = await Promise.all([
    prismaService.certificate.count({
      where: { clubId: club.id, status: CertificateStatus.issued },
    }),
    prismaService.certificate.findMany({
      where: {
        clubId: club.id,
        status: CertificateStatus.issued,
        unlisted: false,
        recipient: { publicProfile: true },
      },
      select: {
        id: true,
        uniqueId: true,
        recipientName: true,
        role: true,
        issueDate: true,
        event: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 24,
    }),
  ]);

  const primary = club.primaryColor || "#323232";
  const accent = club.accentColor || "#38a3e3";

  return (
    <div className="site-page-shell min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div
          className="relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6 shadow-lg sm:p-9"
          style={{
            background: `radial-gradient(circle at 92% 8%, ${accent}55 0%, transparent 34%), linear-gradient(135deg, ${primary} 0%, ${primary}ee 68%, #0c2340 100%)`,
            color: "#fff",
          }}
        >
          <div className="flex flex-wrap items-center gap-4">
            {club.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={club.logoUrl}
                alt=""
                className="h-14 w-14 rounded-xl bg-white object-contain p-1"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 text-lg font-semibold">
                {club.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/70">
                Organization
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                {club.name}
              </h1>
              {club.tagline && (
                <p className="mt-2 max-w-xl text-white/85">{club.tagline}</p>
              )}
            </div>
          </div>
          <p className="mt-6 text-sm text-white/75">
            {`${issuedCount} ${issuedCount === 1 ? "certificate" : "certificates"} issued · Checked on LeoVerify`}
          </p>
        </div>

        <section className="site-section-card mt-6 space-y-4 p-5 sm:p-7" id="verify">
          <h2 className="text-xl font-semibold tracking-tight">Check a certificate</h2>
          <p className="text-sm text-muted-foreground">
            Paste the check link or scan the QR. The ID alone is not enough. Use
            the full link from the certificate.
          </p>
          <VerifyForm compact layout="standard" />
        </section>

        <section className="site-section-card mt-6 p-5 sm:p-7">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Public certificates</h2>
            <p className="text-sm text-muted-foreground">
              Opt-in listings only
            </p>
          </div>
          {publicCerts.length === 0 ? (
            <EmptyState
              icon={FileBadge2}
              title="No public listings yet"
              description="People who turn on a public profile can appear here. Anyone can still check one certificate from the QR."
              action={
                <Link href="/#verify">
                  <Button variant="outline">Verify elsewhere</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {publicCerts.map((cert) => (
                <li
                  key={cert.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/25 px-4 py-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.035]"
                >
                  <div>
                    <p className="font-medium">{cert.recipientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {cert.event.name} · {cert.role}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {cert.uniqueId}
                    </p>
                  </div>
                  <form action={openPublicVerifyAction}>
                    <input type="hidden" name="uniqueId" value={cert.uniqueId} />
                    <Button type="submit" size="sm" variant="outline">
                      Verify
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Powered by{" "}
          <Link href="/" className="font-medium underline-offset-4 hover:underline">
            LeoVerify
          </Link>
          <Badge variant="muted" className="ml-2">
            Live check
          </Badge>
        </p>
      </div>
    </div>
  );
}
