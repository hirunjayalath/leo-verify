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
import { Button } from "@/components/ui/button";
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
      toast.success("Verification link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  const issuerName =
    result.status === "valid" ? result.clubName : null;
  const eventName = result.status === "valid" ? result.eventName : null;

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-card shadow-float">
      <div
        className="pointer-events-none absolute -right-6 -top-4 select-none text-[7rem] font-bold leading-none text-primary/[0.04]"
        aria-hidden
      >
        LV
      </div>

      <div className="border-b border-border bg-brand px-6 py-5 text-white sm:px-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-accent">
          Public verification
        </p>
        <p className="mt-1 font-mono text-sm text-white/80">{uniqueId}</p>
      </div>

      <div className="relative px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <StatusSeal status={result.status} />
            <div className="no-print flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" aria-hidden />
                Print
              </Button>
            </div>
          </div>

          {(issuerName || eventName) && (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Issued by
              </p>
              <p className="mt-1 font-semibold text-foreground">{issuerName}</p>
              {eventName && (
                <p className="mt-0.5 text-sm text-muted-foreground">{eventName}</p>
              )}
            </div>
          )}

          <div>
            {result.status === "valid" && (
              <dl className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Recipient"
                  value={result.recipientName}
                  display
                />
                <Field
                  label="Role / achievement"
                  value={`${result.role}${result.achievement ? ` · ${result.achievement}` : ""}`}
                />
                <Field label="Issue date" value={result.issueDate} />
                <Field label="Status" value="Issued" accent="success" />
              </dl>
            )}

            {result.status === "revoked" && (
              <p className="rounded-xl bg-danger-muted px-5 py-4 text-sm font-medium text-danger">
                {result.message}
              </p>
            )}

            {result.status === "invalid" && (
              <div className="space-y-3">
                <p className="rounded-xl bg-muted px-5 py-4 text-sm text-muted-foreground">
                  {result.message}
                </p>
                <p className="text-sm text-muted-foreground">
                  Open the QR or share link from the certificate — verification needs
                  both the ID and its unguessable token.
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Checked live{" "}
            <time dateTime={checkedAt} className="font-medium text-foreground">
              {formatCheckedAt(checkedAt)}
            </time>
          </p>
        </div>
      </div>

      <div className="space-y-3 border-t border-border bg-muted/40 px-6 py-4 text-xs leading-relaxed text-muted-foreground sm:px-8">
        <div>
          <p className="font-medium text-foreground">What this check means</p>
          <p className="mt-1">
            This page reads live from the LeoVerify database. If a downloaded PDF
            disagrees with these details, trust this page — the PDF is only a
            convenience copy.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">Privacy</p>
          <p className="mt-1">
            This page shows only what is needed to confirm authenticity — email and
            contact details are never shown.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatCheckedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function StatusSeal({ status }: { status: PublicVerificationResult["status"] }) {
  if (status === "valid") {
    return (
      <div className="animate-seal flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-muted text-success ring-4 ring-success/20">
          <ShieldCheck className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-success">
            Valid
          </p>
          <p className="text-lg font-semibold text-foreground">
            Authentic certificate
          </p>
        </div>
      </div>
    );
  }
  if (status === "revoked") {
    return (
      <div className="animate-scale-in flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-muted text-danger ring-4 ring-danger/15">
          <ShieldOff className="h-7 w-7" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-danger">
            Revoked
          </p>
          <p className="text-lg font-semibold text-foreground">No longer valid</p>
        </div>
      </div>
    );
  }
  return (
    <div className="animate-scale-in flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-border">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Invalid
        </p>
        <p className="text-lg font-semibold text-foreground">Could not verify</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  accent,
  display,
}: {
  label: string;
  value: string;
  accent?: "success";
  display?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          accent === "success"
            ? "mt-1 font-medium text-success"
            : display
              ? "mt-1 font-display text-xl font-semibold text-foreground"
              : "mt-1 font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
