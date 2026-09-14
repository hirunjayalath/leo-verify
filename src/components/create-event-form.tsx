"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { createEventAction } from "@/app/(admin)/admin/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function CreateEventForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createEventAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Event created");
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Event name</Label>
        <Input
          id="name"
          name="name"
          required
          autoFocus
          placeholder="Annual Service Day 2026"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="eventDate">Event date</Label>
        <Input id="eventDate" name="eventDate" type="date" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" placeholder="Optional" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
