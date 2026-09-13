import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default async function VerificationPage({ params, searchParams }: PageProps) {
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
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Public verification
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">
          Certificate check
        </h1>
        <p className="mt-2 text-muted-foreground">
          Result is read live from the database — not from any PDF copy.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="font-mono text-base">{uniqueId}</CardTitle>
                <CardDescription className="mt-1">
                  Independent authenticity check
                </CardDescription>
              </div>
              {result.status === "valid" && <Badge variant="success">Valid</Badge>}
              {result.status === "revoked" && <Badge variant="danger">Revoked</Badge>}
              {result.status === "invalid" && <Badge variant="muted">Invalid</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {result.status === "valid" && (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Recipient
                  </dt>
                  <dd className="mt-1 font-medium">{result.recipientName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Role / achievement
                  </dt>
                  <dd className="mt-1 font-medium">
                    {result.role}
                    {result.achievement ? ` · ${result.achievement}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Club
                  </dt>
                  <dd className="mt-1 font-medium">{result.clubName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Event
                  </dt>
                  <dd className="mt-1 font-medium">{result.eventName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Issue date
                  </dt>
                  <dd className="mt-1 font-medium">{result.issueDate}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1 font-medium text-success">Issued</dd>
                </div>
              </dl>
            )}

            {result.status === "revoked" && (
              <p className="rounded-lg bg-danger-muted px-4 py-3 text-sm text-danger">
                {result.message}
              </p>
            )}

            {result.status === "invalid" && (
              <div className="space-y-3">
                <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                  {result.message}
                </p>
                <p className="text-sm text-muted-foreground">
                  Verification requires both the certificate ID and its unguessable
                  token (usually embedded in the QR / share link).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-sm text-muted-foreground">
          <Link href="/#verify" className="font-medium text-primary underline-offset-4 hover:underline">
            Verify another certificate
          </Link>
        </p>
      </div>
    </div>
  );
}
