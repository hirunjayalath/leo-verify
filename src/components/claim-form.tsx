"use client";

import { FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { claimCertificatesAction } from "@/app/(public)/claim/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ClaimForm() {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await claimCertificatesAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Claimed ${result.claimed} certificate(s). Profile: /u/${result.slug}`,
      );
    });
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
