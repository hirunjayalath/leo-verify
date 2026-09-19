"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  setCertificateUnlistedAction,
  updateProfileVisibilityAction,
} from "@/app/(public)/(auth)/claim/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export type RecipientDashboardCert = {
  id: string;
  uniqueId: string;
  eventName: string;
  unlisted: boolean;
  issueDate: string;
  /** Session-only paths — never rendered on public /u/[slug] HTML. */
  verifyPath: string;
  pdfPath: string | null;
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
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Public profile</p>
        <p className="text-xs text-muted-foreground">
          When enabled, anyone can see your listed certificates at{" "}
          {slug ? (
            <Link href={`/u/${slug}`} className="underline underline-offset-4">
              /u/{slug}
            </Link>
          ) : (
            "your profile URL"
          )}
          .
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publicProfile}
            onChange={(e) => setPublicProfile(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Make my profile public
        </label>
        <Button type="button" size="sm" disabled={pending} onClick={saveVisibility}>
          {pending && <Spinner />}
          Save visibility
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Your certificates</p>
        {certs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No claimed certificates yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {certs.map((cert) => (
              <li
                key={cert.id}
                className="space-y-2 rounded-lg border border-border px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{cert.eventName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {cert.uniqueId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued {cert.issueDate}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={cert.unlisted}
                      disabled={pending}
                      onChange={(e) => onUnlisted(cert.id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    Hide from profile
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
