"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { signupPublicOrgAction } from "@/app/(public)/(auth)/signup/actions";
import {
  authEditorialFieldClass,
  authEditorialSubmitClass,
} from "@/components/public/auth-shell";
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
      <div className="space-y-4 border border-[var(--he-line)] bg-[var(--he-panel)] p-4">
        <p className="text-sm leading-relaxed text-[var(--he-muted)]">
          Sign in first. Your signed-in email becomes the organization admin. We
          do not accept a pasted Auth user id.
        </p>
        <Link href="/login?next=/signup" className={authEditorialSubmitClass}>
          Sign in to continue
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="border border-[var(--he-line)] bg-[var(--he-panel)] px-3 py-2.5 text-sm text-[var(--he-muted)]">
        Admin email (from session):{" "}
        <span className="font-medium text-[var(--he-fg)]">{signedInEmail}</span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="orgName" className="text-[var(--he-muted)]">
          Organization name
        </Label>
        <Input
          id="orgName"
          name="orgName"
          autoFocus
          required
          className={authEditorialFieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="orgCode" className="text-[var(--he-muted)]">
          Short code
        </Label>
        <Input
          id="orgCode"
          name="orgCode"
          required
          placeholder="ACME"
          className={authEditorialFieldClass}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminName" className="text-[var(--he-muted)]">
          Admin name
        </Label>
        <Input
          id="adminName"
          name="adminName"
          required
          className={authEditorialFieldClass}
        />
      </div>

      <button
        type="submit"
        className={authEditorialSubmitClass}
        disabled={pending}
      >
        {pending && <Spinner />}
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}
