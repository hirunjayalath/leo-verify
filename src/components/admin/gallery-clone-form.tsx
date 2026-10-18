"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { createFromGalleryAction } from "@/app/(admin)/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { GalleryPreset } from "@/lib/templates/gallery";

export function GalleryCloneForm({
  events,
  gallery,
}: {
  events: { id: string; name: string }[];
  gallery: GalleryPreset[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(gallery[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const preset = gallery.find((g) => g.id === selected);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createFromGalleryAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template created from gallery");
      if (result.id) router.push(`/admin/templates/${result.id}/edit`);
      else router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an event before using the gallery.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {gallery.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelected(g.id)}
            className={
              selected === g.id
                ? "overflow-hidden rounded-md border-2 border-primary ring-2 ring-primary/20"
                : "overflow-hidden rounded-md border border-border hover:border-primary/50"
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.backgroundPath}
              alt={g.name}
              className="aspect-[842/595] w-full object-cover"
            />
            <p className="truncate px-1.5 py-1 text-[10px] font-medium">
              {g.name}
            </p>
          </button>
        ))}
      </div>
      <input type="hidden" name="galleryId" value={selected} />
      <div className="space-y-2">
        <Label htmlFor="gallery-event">Event</Label>
        <Select id="gallery-event" name="eventId" required>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="gallery-name">Template name</Label>
        <Input
          id="gallery-name"
          name="name"
          defaultValue={preset?.name ?? ""}
          key={preset?.id}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending || !selected}>
        {pending && <Spinner />}
        Use this template
      </Button>
    </form>
  );
}
