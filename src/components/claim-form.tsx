"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { claimCertificatesAction } from "@/app/(public)/(auth)/claim/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ClaimForm() {
  const [pending, startTransition] = useTransition();
  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(0);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await claimCertificatesAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSuccessSlug(result.slug ?? null);
      setClaimed(result.claimed ?? 0);
      toast.success(`Claimed ${result.claimed} certificate(s)`);
    });
  }

  if (successSlug) {
    return (
      <div className="space-y-4 rounded-xl border border-success/30 bg-success-muted/40 px-4 py-5">
        <p className="text-sm font-medium text-foreground">
          Claimed {claimed} certificate(s). Your profile slug is ready.
        </p>
        <p className="text-sm text-muted-foreground">
          Profiles stay private until you opt in. You can open the path below anytime.
        </p>
        <Link
          href={`/u/${successSlug}`}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90"
        >
          View profile /u/{successSlug}
        </Link>
        <button
          type="button"
          className="block text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setSuccessSlug(null)}
        >
          Claim another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email used on certificates</Label>
        <Input id="email" name="email" type="email" autoFocus required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" name="name" placeholder="Optional" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Claiming…" : "Claim certificates"}
      </Button>
    </form>
  );
}
