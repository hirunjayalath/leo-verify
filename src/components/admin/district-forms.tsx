"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { toast } from "sonner";
import {
  createClubAction,
  inviteClubAdminAction,
  reviewTemplateAction,
} from "@/app/(admin)/admin/district/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function CreateClubForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createClubAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Club onboarded");
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="club-name">Club name</Label>
        <Input id="club-name" name="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="club-code">Code</Label>
        <Input id="club-code" name="code" required placeholder="UOC" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Creating…" : "Onboard club"}
      </Button>
    </form>
  );
}

export function InviteAdminForm({
  clubs,
}: {
  clubs: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await inviteClubAdminAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Club admin linked");
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Operator steps: create the Auth user in Supabase → copy their UUID → paste
        below to link them as club admin. Invite email is not sent automatically
        in Phase 0.
      </p>
      <div className="space-y-2">
        <Label htmlFor="invite-club">Club</Label>
        <Select id="invite-club" name="clubId" required>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Admin email</Label>
        <Input id="invite-email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" name="name" />
      </div>
      <div className="space-y-2 rounded-lg border border-border px-3 py-3">
        <Label htmlFor="invite-supabase">Supabase Auth user UUID</Label>
        <Input
          id="invite-supabase"
          name="supabaseId"
          required
          placeholder="Paste Auth user UUID from Supabase"
        />
        <p className="text-xs text-muted-foreground">
          Required. Create the user in Supabase Authentication first, then paste
          the UUID here.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Saving…" : "Link club admin"}
      </Button>
    </form>
  );
}

export function ReviewTemplateButtons({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function review(decision: "approved" | "rejected") {
    const formData = new FormData();
    formData.set("id", templateId);
    formData.set("decision", decision);
    startTransition(async () => {
      const result = await reviewTemplateAction(formData);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(decision === "approved" ? "Template approved" : "Template rejected");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => review("approved")}
      >
        {pending && <Spinner />}
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => review("rejected")}
      >
        Reject
      </Button>
    </div>
  );
}
