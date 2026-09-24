import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Clock, ServerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { VerificationResult } from "@/components/verify/verification-result";
import { evaluateVerification } from "@/lib/certificates/verify";
import { loadPublicVerification } from "@/lib/certificates/verify-lookup";
import { clientIpFromHeaders } from "@/lib/rate-limit";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { t } = await searchParams;
  const uniqueId = decodeURIComponent(id);
  const robots = { index: false, follow: false } as const;
  const headerList = await headers();
  const load = await loadPublicVerification(
    uniqueId,
    clientIpFromHeaders(headerList),
  );
  if (load.kind !== "ready") {
    return {
      title: "Certificate check",
      description: "Certificate check on LeoVerify.",
      robots,
    };
  }
  const result = evaluateVerification(load.row, t);

  const ogImagePath = t
    ? `/api/og/verify/${encodeURIComponent(uniqueId)}?t=${encodeURIComponent(t)}`
    : `/api/og/verify/${encodeURIComponent(uniqueId)}`;

  if (result.status === "valid") {
    const title = `${result.recipientName} · ${result.eventName}`;
    const description = `${result.role}, ${result.clubName}. Checked on LeoVerify.`;
    return {
      title,
      description,
      robots,
      openGraph: {
        title,
        description,
        type: "website",
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

  return {
    title: `Verify ${uniqueId}`,
    description: "Certificate check on LeoVerify.",
    robots,
    openGraph: {
      title: "LeoVerify certificate check",
      description: "Certificate check on LeoVerify.",
      images: [{ url: ogImagePath, width: 1200, height: 630 }],
    },
  };
}

export default async function VerificationPage({
  params,
  searchParams,
}: PageProps) {
  const headerList = await headers();
  const { id } = await params;
  const { t } = await searchParams;
  const uniqueId = decodeURIComponent(id);
  const load = await loadPublicVerification(
    uniqueId,
    clientIpFromHeaders(headerList),
  );
  if (load.kind === "limited") {
    return (
      <div className="surface-grid">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={Clock}
            title="Too many requests"
            description="Wait a minute before checking again. This limit keeps the public check page from being hammered."
            action={
              <Link href="/#verify">
                <Button variant="outline">Back to verify</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }
  if (load.kind === "unavailable") {
    return (
      <div className="surface-grid">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={ServerOff}
            title="Certificate check is temporarily unavailable"
            description="We could not reach the records. Try again in a moment."
            action={
              <Link href="/#verify">
                <Button variant="outline">Back to verify</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }
  const result = evaluateVerification(load.row, t);
  const checkedAt = new Date().toISOString();
  const isRevoked = result.status === "revoked";

  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
        {!isRevoked && (
          <>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              LeoVerify
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Certificate check
            </h1>
            <p className="mt-2 text-muted-foreground">
              This result comes from the site, not from a downloaded PDF.
            </p>
          </>
        )}

        <div className={isRevoked ? "" : "mt-8"}>
          <VerificationResult
            uniqueId={uniqueId}
            result={result}
            checkedAt={checkedAt}
          />
        </div>

        {!isRevoked && (
          <p className="mt-8 text-sm text-muted-foreground">
            <Link
              href="/#verify"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Verify another certificate
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
