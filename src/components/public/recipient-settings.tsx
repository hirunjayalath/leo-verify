"use client";

import Link from "next/link";
import { FileBadge2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  setCertificateUnlistedAction,
  updateProfileVisibilityAction,
} from "@/app/(public)/(auth)/claim/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { certificateAboutText } from "@/lib/certificates/pdf-access";
import { cn } from "@/lib/utils";

export type RecipientDashboardCert = {
  id: string;
  uniqueId: string;
  recipientName: string;
  role: string;
  eventName: string;
  unlisted: boolean;
  issueDate: string;
  /** Session-only — never render on public /u/[slug] HTML. */
  verifyPath: string;
  pdfPath: string | null;
  flyerPath: string;
};

export function RecipientSettings({
  slug,
  publicProfile: initialPublic,
  certificates: initialCerts,
}: {
  slug: string | null;
  publicProfile: boolean;
  certificates: RecipientDashboardCert[];
}) {
  const [publicProfile, setPublicProfile] = useState(initialPublic);
  const [certs, setCerts] = useState(initialCerts);
  const [pending, startTransition] = useTransition();

  function saveVisibility() {
    const formData = new FormData();
    if (publicProfile) formData.set("publicProfile", "on");
    startTransition(async () => {
      const result = await updateProfileVisibilityAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setPublicProfile(!!result.publicProfile);
      toast.success(
        result.publicProfile
          ? "Public profile enabled"
          : "Public profile is private again",
      );
    });
  }

  function onUnlisted(certificateId: string, unlisted: boolean) {
    const formData = new FormData();
    formData.set("certificateId", certificateId);
    if (unlisted) formData.set("unlisted", "on");
    startTransition(async () => {
      const result = await setCertificateUnlistedAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCerts((prev) =>
        prev.map((c) => (c.id === certificateId ? { ...c, unlisted } : c)),
      );
      toast.success(unlisted ? "Hidden from profile" : "Shown on profile");
    });
  }

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-elevated">
        <p className="text-sm font-medium">Public profile</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When this is on, anyone can see your listed certificates at{" "}
          {slug ? (
            <Link href={`/u/${slug}`} className="underline underline-offset-4">
              /u/{slug}
            </Link>
          ) : (
            "your profile URL"
          )}
          .
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publicProfile}
            onChange={(e) => setPublicProfile(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Make my profile public
        </label>
        <Button
          type="button"
          size="sm"
          className="mt-4"
          disabled={pending}
          onClick={saveVisibility}
        >
          {pending && <Spinner />}
          Save visibility
        </Button>
      </div>

      <div>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Certificates</h2>
          <p className="text-sm text-muted-foreground">
            {certs.length === 0
              ? "None claimed"
              : `${certs.length} claimed`}
          </p>
        </div>

        {certs.length === 0 ? (
          <EmptyState
            icon={FileBadge2}
            title="No claimed certificates yet"
            description="Claim with the email on your certificates to see them here."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {certs.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium leading-snug text-foreground">
                    {cert.eventName}
                  </p>
                  <Badge variant="success">Valid</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {cert.role}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {cert.uniqueId}
                </p>
                <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                  {cert.issueDate}
                </p>
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={cert.unlisted}
                    disabled={pending}
                    onChange={(e) => onUnlisted(cert.id, e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                  Hide from public profile
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={cert.verifyPath}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                  >
                    Verify
                  </Link>
                  {cert.pdfPath ? (
                    <a
                      href={cert.pdfPath}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "accent" }),
                      )}
                    >
                      Download PDF
                    </a>
                  ) : (
                    <span className="self-center text-xs text-muted-foreground">
                      PDF not available yet
                    </span>
                  )}
                  <a
                    href={cert.flyerPath}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                  >
                    Share flyer
                  </a>
                  <a
                    href={linkedinShareHref(slug, cert.verifyPath)}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                    )}
                  >
                    Share on LinkedIn
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      const text = certificateAboutText({
                        recipientName: cert.recipientName,
                        eventName: cert.eventName,
                        role: cert.role,
                        checkUrl: absoluteAppUrl(cert.verifyPath),
                      });
                      void navigator.clipboard.writeText(text).then(
                        () => toast.success("About text copied"),
                        () => toast.error("Could not copy"),
                      );
                    }}
                  >
                    Copy About text
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

function absoluteAppUrl(path: string) {
  return `${appOrigin()}${path}`;
}

function shareUrlFor(slug: string | null, verifyPath: string) {
  if (slug) return `${appOrigin()}/u/${encodeURIComponent(slug)}`;
  return `${appOrigin()}${verifyPath}`;
}

function linkedinShareHref(slug: string | null, verifyPath: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrlFor(slug, verifyPath))}`;
}
