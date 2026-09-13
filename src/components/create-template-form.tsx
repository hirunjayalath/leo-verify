"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createTemplateAction } from "@/app/(admin)/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateTemplateForm({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await createTemplateAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/templates/${result.id}/edit`);
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an event before adding a template.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eventId">Event</Label>
        <select
          id="eventId"
          name="eventId"
          required
          className="flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Template name</Label>
        <Input id="name" name="name" required placeholder="Service Day certificate" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="background">Background image</Label>
        <Input
          id="background"
          name="background"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Create & design"}
      </Button>
    </form>
  );
}
