"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateClubBrandingAction } from "@/app/(admin)/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function ClubBrandingForm({
  initial,
}: {
  initial: {
    name: string;
    publicSlug: string | null;
    logoUrl: string | null;
    primaryColor: string;
    accentColor: string;
    tagline: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(initial.publicSlug ?? "");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateClubBrandingAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Branding saved");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="publicSlug">Public portal slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">/o/</span>
          <Input
            id="publicSlug"
            name="publicSlug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="acme-training"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your branded org page will be at /o/{slug || "…"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          name="tagline"
          defaultValue={initial.tagline ?? ""}
          maxLength={160}
          placeholder="Credentials that prove achievement"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary color</Label>
          <div className="flex gap-2">
            <Input
              id="primaryColor"
              name="primaryColor"
              type="color"
              defaultValue={initial.primaryColor}
              className="h-10 w-14 cursor-pointer p-1"
            />
            <Input
              defaultValue={initial.primaryColor}
              readOnly
              className="font-mono text-xs"
              aria-label="Primary hex"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="accentColor">Accent color</Label>
          <div className="flex gap-2">
            <Input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={initial.accentColor}
              className="h-10 w-14 cursor-pointer p-1"
            />
            <Input
              defaultValue={initial.accentColor}
              readOnly
              className="font-mono text-xs"
              aria-label="Accent hex"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Organization logo</Label>
        {initial.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initial.logoUrl}
            alt={`${initial.name} logo`}
            className="mb-2 h-12 w-auto rounded border border-border bg-white object-contain p-1"
          />
        )}
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg"
        />
        <p className="text-xs text-muted-foreground">PNG or JPEG, max 2 MB.</p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        Save branding
      </Button>
    </form>
  );
}
