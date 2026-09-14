"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useTransition } from "react";
import { toast } from "sonner";
import { createTemplateAction } from "@/app/(admin)/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function CreateTemplateForm({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createTemplateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template created — opening designer");
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
        <Select id="eventId" name="eventId" required>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Template name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Service Day certificate"
        />
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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Uploading…" : "Create & design"}
      </Button>
    </form>
  );
}
