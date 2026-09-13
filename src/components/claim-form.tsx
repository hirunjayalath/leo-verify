"use client";

import { FormEvent, useState, useTransition } from "react";
import { claimCertificatesAction } from "@/app/(public)/claim/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ClaimForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await claimCertificatesAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(
        `Claimed ${result.claimed} certificate(s). Profile slug: /u/${result.slug} (private until you opt in).`,
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email used on certificates</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" name="name" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Claiming…" : "Claim certificates"}
      </Button>
    </form>
  );
}
