import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileBadge2 } from "lucide-react";
import { openPublicVerifyAction } from "@/app/(public)/(site)/u/[slug]/actions";
import { VerifyForm } from "@/components/verify-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CertificateStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const club = await prisma.club.findUnique({ where: { publicSlug: slug } });
  if (!club) return { title: "Organization", robots: { index: false } };
  return {
    title: club.name,
    description: club.tagline ?? `${club.name} credentials on LeoVerify`,
    robots: { index: true, follow: true },
  };
}

export default async function OrgPortalPage({ params }: PageProps) {
  const { slug } = await params;
  const club = await prisma.club.findUnique({
    where: { publicSlug: slug },
  });
  if (!club) notFound();

  const [issuedCount, publicCerts] = await Promise.all([
    prisma.certificate.count({
      where: { clubId: club.id, status: CertificateStatus.issued },
    }),
    prisma.certificate.findMany({
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
    <div className="surface-grid">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div
          className="rounded-2xl border border-border p-6 sm:p-8"
          style={{
            background: `linear-gradient(145deg, ${primary} 0%, ${primary}ee 60%, ${accent}33 100%)`,
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
            {issuedCount} credential{issuedCount === 1 ? "" : "s"} issued ·
            Verified live on LeoVerify
          </p>
        </div>

        <section className="mt-10 space-y-4" id="verify">
          <h2 className="text-lg font-semibold">Verify a credential</h2>
          <p className="text-sm text-muted-foreground">
            Paste a verify link or scan a QR. Lookups require the HMAC token —
            IDs alone are not enough.
          </p>
          <VerifyForm compact />
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Public credentials</h2>
            <p className="text-sm text-muted-foreground">
              Opt-in listings only
            </p>
          </div>
          {publicCerts.length === 0 ? (
            <EmptyState
              icon={FileBadge2}
              title="No public listings yet"
              description="Recipients who opt into a public profile can appear here. Single-certificate verify stays open via QR."
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
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
            Live DB verify
          </Badge>
        </p>
      </div>
    </div>
  );
}
