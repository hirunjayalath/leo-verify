"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createDistrictAction,
  disableDistrictAdminAction,
  inviteDistrictAdminAction,
} from "@/app/(admin)/admin/operators/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function CreateDistrictForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDistrictAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("District created");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="district-name">Name</Label>
        <Input id="district-name" name="name" required placeholder="District 306 A2" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="district-code">Code</Label>
        <Input id="district-code" name="code" required placeholder="306A2" />
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending && <Spinner />}
        Create district
      </Button>
    </form>
  );
}

export function InviteDistrictAdminForm({
  districts,
}: {
  districts: { id: string; name: string; clubs: { id: string; name: string }[] }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [districtId, setDistrictId] = useState(districts[0]?.id ?? "");
  const clubs = useMemo(
    () => districts.find((d) => d.id === districtId)?.clubs ?? [],
    [districtId, districts],
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await inviteDistrictAdminAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("District admin invited");
      router.refresh();
    });
  }

  if (districts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Create a district first.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="invite-district">District</Label>
        <Select
          id="invite-district"
          name="districtId"
          value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          required
        >
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-club">Assigned club</Label>
        <Select id="invite-club" name="clubId" required>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" name="name" />
      </div>
      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={pending || clubs.length === 0}
      >
        {pending && <Spinner />}
        Send invite
      </Button>
    </form>
  );
}

export function DisableDistrictAdminButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const formData = new FormData();
        formData.set("userId", userId);
        startTransition(async () => {
          const result = await disableDistrictAdminAction(formData);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("District admin disabled");
          router.refresh();
        });
      }}
    >
      {pending && <Spinner />}
      Disable
    </Button>
  );
}
