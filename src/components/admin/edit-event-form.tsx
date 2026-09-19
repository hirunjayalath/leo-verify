"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEventAction } from "@/app/(admin)/admin/events/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function EditEventForm({
  event,
}: {
  event: {
    id: string;
    name: string;
    description: string | null;
    eventDate: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", event.id);
    startTransition(async () => {
      const result = await updateEventAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Event updated");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-0 text-xs font-medium text-primary"
        onClick={() => setOpen(true)}
      >
        Edit
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 space-y-3 rounded-xl border border-border bg-muted/30 p-3"
    >
      <div className="space-y-2">
        <Label htmlFor={`name-${event.id}`}>Name</Label>
        <Input
          id={`name-${event.id}`}
          name="name"
          defaultValue={event.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`date-${event.id}`}>Event date</Label>
        <Input
          id={`date-${event.id}`}
          name="eventDate"
          type="date"
          defaultValue={event.eventDate ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`desc-${event.id}`}>Description</Label>
        <Input
          id={`desc-${event.id}`}
          name="description"
          defaultValue={event.description ?? ""}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Spinner />}
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
