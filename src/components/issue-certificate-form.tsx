"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { issueOneCertificateAction } from "@/app/(admin)/admin/certificates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildVerificationPath } from "@/lib/certificates/token";

export function IssueCertificateForm({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await issueOneCertificateAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const path = buildVerificationPath(
        result.uniqueId!,
        result.verificationToken!,
      );
      setSuccess(`Issued ${result.uniqueId}. Verify at ${path}`);
      form.reset();
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an event (and preferably a template) before issuing.
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
        <Label htmlFor="recipientName">Recipient name</Label>
        <Input id="recipientName" name="recipientName" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="recipientEmail">Recipient email</Label>
        <Input id="recipientEmail" name="recipientEmail" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input id="role" name="role" required placeholder="Volunteer" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="achievement">Achievement</Label>
        <Input id="achievement" name="achievement" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="issueDate">Issue date</Label>
        <Input id="issueDate" name="issueDate" type="date" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Issuing…" : "Issue certificate"}
      </Button>
    </form>
  );
}
