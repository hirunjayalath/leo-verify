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
    const file = formData.get("background");
    if (file instanceof File && file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }
    startTransition(async () => {
      try {
        const result = await createTemplateAction(formData);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Template created. Opening designer.");
        router.push(`/admin/templates/${result.id}/edit`);
        router.refresh();
      } catch {
        toast.error("Image must be 5 MB or smaller");
      }
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
        <Label htmlFor="kind">Document type</Label>
        <Select id="kind" name="kind" defaultValue="certificate">
          <option value="certificate">Certificate</option>
          <option value="service_letter">Service letter</option>
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
          accept="image/png,image/jpeg"
          required
        />
        <p className="text-xs text-muted-foreground">PNG or JPEG, 5 MB or smaller.</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Uploading…" : "Create & design"}
      </Button>
    </form>
  );
}
