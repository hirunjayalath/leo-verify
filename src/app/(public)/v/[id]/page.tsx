import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerificationResult } from "@/components/verification-result";
import { evaluateVerification } from "@/lib/certificates/verify";
import { prisma } from "@/lib/db";
import {
  clientIpFromHeaders,
  rateLimitVerification,
} from "@/lib/rate-limit";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Verify ${decodeURIComponent(id)}`,
    robots: { index: false, follow: false },
  };
}

async function lookupCertificate(uniqueId: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const row = await prisma.certificate.findUnique({
      where: { uniqueId },
      select: {
        uniqueId: true,
        verificationToken: true,
        recipientName: true,
        role: true,
        achievement: true,
        issueDate: true,
        status: true,
        clubId: true,
        eventId: true,
        event: {
          select: {
            name: true,
            club: { select: { name: true } },
          },
        },
      },
    });

    if (!row) return null;

    return {
      uniqueId: row.uniqueId,
      verificationToken: row.verificationToken,
      recipientName: row.recipientName,
      role: row.role,
      achievement: row.achievement,
      issueDate: row.issueDate,
      status: row.status,
      clubId: row.clubId,
      eventId: row.eventId,
      clubName: row.event.club.name,
      eventName: row.event.name,
    };
  } catch {
    return null;
  }
}

export default async function VerificationPage({
  params,
  searchParams,
}: PageProps) {
  const headerList = await headers();
  const limit = await rateLimitVerification(clientIpFromHeaders(headerList));
  if (!limit.success) {
    return (
      <div className="surface-grid">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Too many requests</CardTitle>
              <CardDescription>
                Please wait a minute before verifying again.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const { id } = await params;
  const { t } = await searchParams;
  const uniqueId = decodeURIComponent(id);
  const row = await lookupCertificate(uniqueId);
  const result = evaluateVerification(row, t);

  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Independent authenticity check
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0b1f3a] dark:text-foreground">
          Certificate check
        </h1>
        <p className="mt-2 text-muted-foreground">
          Result is read live from the database — not from any PDF copy.
        </p>

        <div className="mt-8">
          <VerificationResult uniqueId={uniqueId} result={result} />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          <Link
            href="/#verify"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Verify another certificate
          </Link>
        </p>
      </div>
    </div>
  );
}
