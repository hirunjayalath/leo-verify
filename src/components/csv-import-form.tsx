"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { startCsvImportAction } from "@/app/(admin)/admin/certificates/import-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function CsvImportForm({
  events,
}: {
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [rowErrors, setRowErrors] = useState<
    { rowNumber: number; message: string }[]
  >([]);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setRowErrors([]);
    startTransition(async () => {
      const result = await startCsvImportAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        setRowErrors(result.rowErrors ?? []);
        return;
      }
      if (result.mode === "async") {
        toast.success(`Import job queued (${result.totalRows ?? "?"} rows)`);
      } else {
        const issued = result.successRows ?? 0;
        const skipped = result.skippedRows ?? 0;
        const failed = result.failedRows ?? 0;
        const summary = `${issued} issued · ${skipped} skipped · ${failed} failed`;
        if (failed > 0 && issued === 0 && skipped === 0) {
          toast.error(`Import finished with failures — ${summary}`);
        } else if (failed > 0) {
          toast.message(`Import completed with some failures — ${summary}`);
        } else {
          toast.success(`Import completed — ${summary}`);
        }
      }
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
        <Select id="import-eventId" name="eventId" required>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="csv">CSV file</Label>
        <Input id="csv" name="csv" type="file" accept=".csv,text/csv" required />
        <p className="text-xs text-muted-foreground">
          Requires an approved template on the selected event. Columns: name,
          email, role, achievement (header row required). All rows are validated
          before any certificate is created.
        </p>
      </div>
      {rowErrors.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-auto rounded-lg bg-danger-muted p-3 text-xs text-danger">
          {rowErrors.map((err) => (
            <li key={`${err.rowNumber}-${err.message}`}>
              Row {err.rowNumber}: {err.message}
            </li>
          ))}
        </ul>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {pending ? "Importing…" : "Validate & import"}
      </Button>
    </form>
  );
}
