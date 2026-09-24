"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { issueOneCertificateAction } from "@/app/(admin)/admin/certificates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { buildVerificationPath } from "@/lib/certificates/token";

export function IssueCertificateForm({
  events,
}: {
  events: {
    id: string;
    name: string;
    templates: { id: string; name: string }[];
  }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const templates = events.find((event) => event.id === eventId)?.templates ?? [];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await issueOneCertificateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.skipped) {
        toast.message("Already issued. Returning the existing certificate", {
          description: result.uniqueId,
        });
        router.refresh();
        return;
      }
      const path = buildVerificationPath(
        result.uniqueId!,
        result.verificationToken!,
      );
      const absolute =
        typeof window !== "undefined"
          ? `${window.location.origin}${path}`
          : path;
      toast.success(`Issued ${result.uniqueId}`, {
        description: "Copy the check link to share, or open the QR target.",
        action: {
          label: "Copy check link",
          onClick: () => {
            void navigator.clipboard.writeText(absolute).then(
              () => toast.success("Check link copied"),
              () => toast.error("Could not copy"),
            );
          },
        },
      });
      form.reset();
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an event and a template before issuing.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eventId">Event</Label>
        <Select
          id="eventId"
          name="eventId"
          required
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="templateId">Template</Label>
        <Select id="templateId" name="templateId" required>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
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
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Issuing…" : "Issue certificate"}
      </Button>
    </form>
  );
}
