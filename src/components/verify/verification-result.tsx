"use client";

import {
  Check,
  Copy,
  Printer,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/public/brand-logo";
import { Button } from "@/components/ui/button";
import { formatCheckedAt } from "@/lib/format";
import type { PublicVerificationResult } from "@/lib/certificates/verify";

export function VerificationResult({
  uniqueId,
  result,
  checkedAt,
}: {
  uniqueId: string;
  result: PublicVerificationResult;
  checkedAt: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Verification link copied to clipboard");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Could not copy link");
    }
  }

  // Policy: revoked pages show only the revocation message — no ID, seal chrome, or actions.
  if (result.status === "revoked") {
    return (
      <div className="animate-fade-up rounded-3xl border border-danger/30 bg-card/90 px-6 py-12 shadow-elevated sm:px-8">
        <p className="text-center text-base font-medium text-danger">
          {result.message}
        </p>
      </div>
    );
  }

  const issuerName = result.status === "valid" ? result.clubName : null;
  const eventName = result.status === "valid" ? result.eventName : null;

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-border/80 bg-card/90 shadow-glass backdrop-blur-xl">
      <BrandMark
        size={120}
        className="pointer-events-none absolute -right-3 -top-3 opacity-[0.04] dark:opacity-[0.07]"
      />

      {/* Top Pass Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-[#0C2340] to-[#00338D] px-6 py-4.5 text-white sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="caption-caps text-accent">
              Official Credential Record
            </p>
            <p className="mt-0.5 font-mono text-xs font-semibold tracking-wide text-white/90">
              {uniqueId}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Verified
          </span>
        </div>
      </div>

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          {/* Status Banner & Action Dock */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <StatusSeal status={result.status} />

            <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="shadow-sm"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                <span>{copied ? "Copied" : "Copy link"}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Print
              </Button>
            </div>
          </div>

          {/* Issuer Box */}
          {(issuerName || eventName) && (
            <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 backdrop-blur-sm sm:p-5">
              <p className="caption-caps text-muted-foreground">
                Issued by
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {issuerName}
              </p>
              {eventName && (
                <p className="mt-0.5 text-sm text-muted-foreground">{eventName}</p>
              )}
            </div>
          )}

          {/* Credential Attributes */}
          <div>
            {result.status === "valid" && (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 divide-y divide-border/60">
                <div className="p-4 sm:p-5">
                  <dt className="caption-caps text-muted-foreground">
                    Recipient
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    {result.recipientName}
                  </dd>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <div>
                    <dt className="caption-caps text-muted-foreground">
                      Role / Achievement
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {result.role}
                      {result.achievement ? ` · ${result.achievement}` : ""}
                    </dd>
                  </div>

                  <div>
                    <dt className="caption-caps text-muted-foreground">
                      Issue Date
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-medium text-foreground">
                      {result.issueDate}
                    </dd>
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <dt className="caption-caps text-muted-foreground">
                      Verification Ground Truth
                    </dt>
                    <dd className="mt-0.5 text-xs text-muted-foreground">
                      Verified directly against Supabase authoritative records
                    </dd>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-muted/70 px-3 py-1 text-xs font-semibold text-success">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Valid & Active
                  </span>
                </div>
              </div>
            )}

            {result.status === "invalid" && (
              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {result.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please verify that you have pasted the complete link including the{" "}
                  <code className="font-mono text-foreground font-semibold">?t=</code> parameter,
                  or scan the original physical QR code.
                </p>
              </div>
            )}
          </div>

          {result.status === "valid" && (
            <p className="text-sm text-muted-foreground">
              Recipient:{" "}
              <a
                href="/login?next=/claim"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                sign in to download or share
              </a>
              .
            </p>
          )}

          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Checked live at</span>
            <time dateTime={checkedAt} className="font-medium text-foreground">
              {formatCheckedAt(checkedAt)}
            </time>
          </div>
        </div>
      </div>

      {/* Security and Privacy Notes */}
      <div className="space-y-3 border-t border-border/70 bg-muted/30 p-6 text-xs leading-relaxed text-muted-foreground sm:px-8">
        <div>
          <p className="font-semibold text-foreground">What this check means</p>
          <p className="mt-0.5">
            This verification is evaluated live against the database. If any
            downloaded PDF or paper certificate disagrees with these details,
            this live web verification is the sole authoritative record.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Privacy Protection</p>
          <p className="mt-0.5">
            Public verification displays only the recipient name, issuing club,
            event, date, role, and verification status. Personal emails and phone
            numbers are never disclosed publicly.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusSeal({ status }: { status: PublicVerificationResult["status"] }) {
  if (status === "valid") {
    return (
      <div className="animate-seal flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success-muted text-success ring-4 ring-success/20 shadow-sm">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="caption-caps text-success">
            Status: Valid
          </p>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            Official Authenticated Certificate
          </p>
        </div>
      </div>
    );
  }
  if (status === "revoked") {
    return (
      <div className="animate-scale-in flex items-center gap-3.5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-danger-muted text-danger ring-4 ring-danger/20 shadow-sm">
          <ShieldOff className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="caption-caps text-danger">
            Status: Revoked
          </p>
          <p className="text-lg font-semibold tracking-tight text-foreground">No longer valid</p>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-scale-in flex items-center gap-3.5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-4 ring-border shadow-sm">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <p className="caption-caps text-muted-foreground">
          Status: Invalid
        </p>
        <p className="text-lg font-semibold tracking-tight text-foreground">
          Could not verify certificate
        </p>
      </div>
    </div>
  );
}
