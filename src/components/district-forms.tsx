"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import {
  createClubAction,
  inviteClubAdminAction,
  reviewTemplateAction,
} from "@/app/(admin)/admin/district/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClubForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createClubAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      (e.target as HTMLFormElement).reset();
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
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await inviteClubAdminAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="invite-club">Club</Label>
        <select
          id="invite-club"
          name="clubId"
          required
          className="flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Admin email</Label>
        <Input id="invite-email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" name="name" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-supabase">Supabase Auth user UUID</Label>
        <Input id="invite-supabase" name="supabaseId" required />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>
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
      await reviewTemplateAction(formData);
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
