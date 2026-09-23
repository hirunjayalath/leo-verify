"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { signupPublicOrgAction } from "@/app/(public)/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function SignupForm({
  signedInEmail,
}: {
  signedInEmail?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signedInEmail) {
      toast.error("Sign in before creating an organization");
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signupPublicOrgAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization created. Opening admin.");
      router.push("/admin");
      router.refresh();
    });
  }

  if (!signedInEmail) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-sm text-muted-foreground">
          Sign in first. Your signed-in email becomes the organization admin. We
          do not accept a pasted Auth user id.
        </p>
        <Link href="/login?next=/signup">
          <Button type="button" variant="brand" size="lg" className="w-full">
            Sign in to continue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
        Admin email (from session):{" "}
        <span className="font-medium text-foreground">{signedInEmail}</span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="orgName">Organization name</Label>
        <Input id="orgName" name="orgName" autoFocus required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="orgCode">Short code</Label>
        <Input id="orgCode" name="orgCode" required placeholder="ACME" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminName">Admin name</Label>
        <Input id="adminName" name="adminName" required />
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
