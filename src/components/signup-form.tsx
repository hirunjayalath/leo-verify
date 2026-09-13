"use client";

import { FormEvent, useState, useTransition } from "react";
import { signupPublicOrgAction } from "@/app/(public)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await signupPublicOrgAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(
        `Organization created (${result.clubId}). Sign in at /login with the linked Auth user.`,
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="orgName">Organization name</Label>
        <Input id="orgName" name="orgName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="orgCode">Short code</Label>
        <Input id="orgCode" name="orgCode" required placeholder="ACME" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminName">Admin name</Label>
        <Input id="adminName" name="adminName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin email</Label>
        <Input id="adminEmail" name="adminEmail" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="supabaseId">Supabase Auth user UUID</Label>
        <Input id="supabaseId" name="supabaseId" required />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
