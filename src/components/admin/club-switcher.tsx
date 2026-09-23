"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { switchActingClubAction } from "@/app/(admin)/admin/district/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ClubOption = { id: string; name: string };

export function ClubSwitcher({
  clubs,
  currentClubId,
  variant = "page",
}: {
  clubs: ClubOption[];
  currentClubId?: string | null;
  variant?: "page" | "sidebar";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function applyClub(clubId: string) {
    const formData = new FormData();
    formData.set("clubId", clubId);
    startTransition(async () => {
      const result = await switchActingClubAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(clubId ? "Working as that club" : "Back to district only");
      router.refresh();
      router.push(clubId ? "/admin" : "/admin/district");
    });
  }

  if (variant === "sidebar") {
    return (
      <div className="mb-3 space-y-1.5 px-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Work as
        </p>
        <Select
          aria-label="Work as club"
          className="h-9 border-white/15 bg-white/10 text-xs text-white"
          disabled={pending}
          value={currentClubId ?? ""}
          onChange={(event) => applyClub(event.target.value)}
        >
          <option value="">District only</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        applyClub(String(new FormData(event.currentTarget).get("clubId") ?? ""));
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="acting-club">Club</Label>
        <Select
          id="acting-club"
          name="clubId"
          defaultValue={currentClubId ?? ""}
          disabled={pending}
        >
          <option value="">District only</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Switching…" : "Work as this club"}
      </Button>
      <p className={cn("text-xs text-muted-foreground")}>
        Opens the club dashboard for issue, templates, and certificates.
      </p>
    </form>
  );
}
