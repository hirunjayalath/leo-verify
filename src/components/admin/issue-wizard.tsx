"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { issueOneCertificateAction } from "@/app/(admin)/admin/certificates/actions";
import { CsvImportForm } from "@/components/admin/csv-import-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const steps = ["Event", "Recipients", "Send"] as const;

export function IssueWizard({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [draft, setDraft] = useState({
    recipientName: "",
    recipientEmail: "",
    role: "Participant",
    achievement: "",
  });
  const [pending, startTransition] = useTransition();

  function onIssueOne(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("eventId", eventId);
    formData.set("recipientName", draft.recipientName);
    formData.set("recipientEmail", draft.recipientEmail);
    formData.set("role", draft.role);
    formData.set("achievement", draft.achievement);
    startTransition(async () => {
      const result = await issueOneCertificateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.skipped ? "Already issued (skipped)" : "Certificate issued",
      );
      router.push("/admin/certificates");
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create an event and approve a template first.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(Math.min(i, step))}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                step === i
                  ? "bg-brand text-brand-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wiz-event">Event</Label>
            <Select
              id="wiz-event"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={() => setStep(1)} disabled={!eventId}>
            Continue
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "one" ? "default" : "outline"}
              onClick={() => setMode("one")}
            >
              Issue one
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "bulk" ? "default" : "outline"}
              onClick={() => setMode("bulk")}
            >
              Bulk roster
            </Button>
          </div>
          {mode === "one" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient name</Label>
                <Input
                  id="recipientName"
                  value={draft.recipientName}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, recipientName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipientEmail">Email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={draft.recipientEmail}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, recipientEmail: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={draft.role}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, role: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="achievement">Achievement</Label>
                <Input
                  id="achievement"
                  value={draft.achievement}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, achievement: e.target.value }))
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!draft.recipientName.trim() || !draft.role.trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <CsvImportForm events={events.filter((e) => e.id === eventId)} />
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && mode === "one" && (
        <form onSubmit={onIssueOne} className="space-y-4">
          <div className="rounded-xl border border-border p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Event:</span>{" "}
              {events.find((e) => e.id === eventId)?.name}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Recipient:</span>{" "}
              {draft.recipientName}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Email:</span>{" "}
              {draft.recipientEmail || "None"}
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Role:</span> {draft.role}
            </p>
            {draft.achievement.trim() ? (
              <p className="mt-1">
                <span className="text-muted-foreground">Achievement:</span>{" "}
                {draft.achievement}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Issue & send
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
