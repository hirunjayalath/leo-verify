"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { claimCertificatesAction } from "@/app/(public)/(auth)/claim/actions";
import {
  RecipientSettings,
  type RecipientDashboardCert,
} from "@/components/recipient-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ClaimForm({
  authEmail,
  initialSettings,
}: {
  authEmail: string | null;
  initialSettings?: {
    slug: string | null;
    publicProfile: boolean;
    certificates: RecipientDashboardCert[];
  } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [successSlug, setSuccessSlug] = useState<string | null>(
    initialSettings?.slug ?? null,
  );
  const [claimed, setClaimed] = useState<number | null>(
    initialSettings ? null : null,
  );
  const [settings, setSettings] = useState(initialSettings ?? null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!authEmail) {
      toast.error("Sign in with your certificate email first");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("email", authEmail);
    startTransition(async () => {
      const result = await claimCertificatesAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSuccessSlug(result.slug ?? null);
      setClaimed(result.claimed ?? 0);
      setSettings({
        slug: result.slug ?? null,
        publicProfile: result.publicProfile ?? false,
        certificates: result.certificates ?? [],
      });
      toast.success(`Claimed ${result.claimed} certificate(s)`);
    });
  }

  if (!authEmail) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/40 px-4 py-5 text-sm">
        <p className="font-medium text-foreground">Sign in required</p>
        <p className="text-muted-foreground">
          Claim uses your signed-in email so only you can link certificates
          issued to that address.
        </p>
        <Link
          href="/login?next=/claim"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground"
        >
          Sign in to claim
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email used on certificates</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={authEmail}
            readOnly
            className="bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" name="name" placeholder="Optional" autoFocus />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Claiming…" : "Claim certificates"}
        </Button>
      </form>

      {successSlug && (
        <div className="space-y-4 rounded-xl border border-success/30 bg-success-muted/40 px-4 py-5">
          <p className="text-sm font-medium text-foreground">
            {claimed != null
              ? `Claimed ${claimed} certificate(s). Next steps below.`
              : "Your claim profile is ready."}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Toggle public profile if you want a shareable listing.</li>
            <li>Mark certificates unlisted if they should stay private.</li>
            <li>Copy or open your profile URL when you are ready to share.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/u/${successSlug}`}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90"
            >
              View profile /u/{successSlug}
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  const url = `${window.location.origin}/u/${successSlug}`;
                  await navigator.clipboard.writeText(url);
                  toast.success("Profile URL copied");
                } catch {
                  toast.error("Could not copy link");
                }
              }}
            >
              Copy profile URL
            </Button>
          </div>
        </div>
      )}

      {settings && (
        <RecipientSettings
          slug={settings.slug}
          publicProfile={settings.publicProfile}
          certificates={settings.certificates}
        />
      )}
    </div>
  );
}
