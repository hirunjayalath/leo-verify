"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { startCsvImportAction } from "@/app/(admin)/admin/certificates/import-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CsvImportForm({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<
    { rowNumber: number; message: string }[]
  >([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setRowErrors([]);
    setSuccess(null);
    startTransition(async () => {
      const result = await startCsvImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        setRowErrors(result.rowErrors ?? []);
        return;
      }
      setSuccess(
        result.mode === "async"
          ? `Import job ${result.jobId} queued.`
          : `Import job ${result.jobId} completed.`,
      );
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Create an event first.</p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="import-eventId">Event</Label>
        <select
          id="import-eventId"
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
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">
          Columns: name, email, role, achievement (header row required). All rows
          are validated before any certificate is created.
        </p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {rowErrors.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-auto rounded-lg bg-danger-muted p-3 text-xs text-danger">
          {rowErrors.map((err) => (
            <li key={`${err.rowNumber}-${err.message}`}>
              Row {err.rowNumber}: {err.message}
            </li>
          ))}
        </ul>
      )}
      {success && <p className="text-sm text-success">{success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Importing…" : "Validate & import"}
      </Button>
    </form>
  );
}
