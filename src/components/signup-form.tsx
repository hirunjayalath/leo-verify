"use client";

import { FormEvent, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { signupPublicOrgAction } from "@/app/(public)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const uuid = String(formData.get("supabaseId") || "").trim();
    if (!uuid) {
      setAdvancedOpen(true);
      toast.error("Open Advanced and paste the Supabase Auth user UUID");
      return;
    }
    startTransition(async () => {
      const result = await signupPublicOrgAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        "Organization created. Sign in at /login with the linked Auth user.",
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin email</Label>
        <Input id="adminEmail" name="adminEmail" type="email" required />
      </div>

      <div className="rounded-lg border border-border">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-muted-foreground hover:bg-muted/50"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
        >
          Advanced · Auth linking
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              advancedOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <div className={cn("space-y-2 border-t border-border px-3 py-3", !advancedOpen && "hidden")}>
          <Label htmlFor="supabaseId">Supabase Auth user UUID</Label>
          <Input id="supabaseId" name="supabaseId" />
          <p className="text-xs text-muted-foreground">
            Create the admin user in Supabase Auth first, then paste the UUID here.
          </p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Creating…" : "Create organization"}
      </Button>
    </form>
  );
}
