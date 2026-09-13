import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CertificateStatus } from "@/generated/prisma/client";
import { buildVerificationPath } from "@/lib/certificates/token";
import { prisma } from "@/lib/db";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipient = await prisma.recipient.findUnique({ where: { slug } });
  if (!recipient?.publicProfile) {
    return { title: "Profile", robots: { index: false, follow: false } };
  }
  return {
    title: `${recipient.name ?? "Recipient"} · LeoVerify`,
    description: "Public LeoVerify credential profile",
    openGraph: {
      title: `${recipient.name ?? "Recipient"} credentials`,
      description: "Verified certificates on LeoVerify",
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const recipient = await prisma.recipient.findUnique({
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

  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Public profile
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-primary">
          {recipient.name ?? "LeoVerify recipient"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Opt-in credential listing. Single-certificate verification remains available
          via QR without a profile.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Certificates</CardTitle>
            <CardDescription>
              {recipient.certificates.length === 0
                ? "No public certificates listed"
                : `${recipient.certificates.length} visible`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {recipient.certificates.map((cert) => (
                <li key={cert.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{cert.event.name}</p>
                    <Badge variant="success">Valid</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cert.role}
                    {cert.achievement ? ` · ${cert.achievement}` : ""} ·{" "}
                    {cert.event.club.name} ·{" "}
                    {cert.issueDate.toISOString().slice(0, 10)}
                  </p>
                  <Link
                    href={buildVerificationPath(
                      cert.uniqueId,
                      cert.verificationToken,
                    )}
                    className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Verify {cert.uniqueId}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
