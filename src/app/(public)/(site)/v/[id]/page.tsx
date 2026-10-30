import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Clock, ServerOff, ArrowLeft, Database, ShieldCheck, FileCheck, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { VerificationResult } from "@/components/verify/verification-result";
import { evaluateVerification } from "@/lib/certificates/verify";
import { loadPublicVerification } from "@/lib/certificates/verify-lookup";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { cn } from "@/lib/utils";

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
    <div className="site-page-shell min-h-[calc(100vh-4rem)] py-8 sm:py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        {!isRevoked && (
          <div className="mb-6">
            <Link
              href="/#verify"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground hover:border-border shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to search</span>
            </Link>
          </div>
        )}

        {/* 2-Column Responsive Layout Matching Image 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Verification Card */}
          <div className={cn(isRevoked ? "lg:col-span-12 max-w-xl mx-auto w-full" : "lg:col-span-7")}>
            <VerificationResult
              uniqueId={uniqueId}
              result={result}
              checkedAt={checkedAt}
            />
          </div>

          {/* Side Panels (Sources & Suggested tasks) */}
          {!isRevoked && (
            <div className="lg:col-span-5 space-y-5">
              {/* Sources Panel */}
              <div className="site-section-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Sources & Evidence
                  </h3>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 py-6 px-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mb-2.5">
                    <Database className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    PostgreSQL Live Query
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Evaluated live with Postgres RLS isolation and HMAC SHA-256 integrity.
                  </p>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    <span className="text-muted-foreground">Record state</span>
                    <span className="font-semibold text-foreground">Live Database</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    <span className="text-muted-foreground">Privacy scope</span>
                    <span className="font-semibold text-foreground">Public attributes only</span>
                  </div>
                </div>
              </div>

              {/* Suggested Tasks Panel */}
              <div className="site-section-card p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Suggested Actions
                </h3>
                <div className="space-y-2">
                  <Link
                    href="/#verify"
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <span>Check another certificate</span>
                    <FileCheck className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/claim"
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <span>Claim to your recipient profile</span>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link
                    href="/how-it-works"
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <span>How tamper detection works</span>
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
