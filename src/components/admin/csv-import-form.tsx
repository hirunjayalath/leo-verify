"use client";

import { useRouter } from "next/navigation";
import {
  DragEvent,
  FormEvent,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { startCsvImportAction } from "@/app/(admin)/admin/certificates/import-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  ROSTER_FIELDS,
  autoMapHeaders,
  mappingIsComplete,
  parseCsvText,
  parseXlsxBuffer,
  type ColumnMapping,
  type RosterField,
} from "@/lib/certificates/csv";
import { cn } from "@/lib/utils";

type PreviewState = {
  file: File;
  headers: string[];
  mapping: ColumnMapping;
  needsMapping: boolean;
};

export function CsvImportForm({
  events,
}: {
  events: {
    id: string;
    name: string;
    templates: { id: string; name: string }[];
  }[];
}) {
  const router = useRouter();
  const [rowErrors, setRowErrors] = useState<
    { rowNumber: number; message: string }[]
  >([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const templates = events.find((event) => event.id === eventId)?.templates ?? [];

  const loadFile = useCallback(async (file: File) => {
    setRowErrors([]);
    const name = file.name.toLowerCase();
    if (
      !name.endsWith(".csv") &&
      !name.endsWith(".xlsx") &&
      !name.endsWith(".xls")
    ) {
      toast.error("Upload a .csv or .xlsx file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be 2 MB or smaller");
      return;
    }

    let parsed:
      | { headers: string[]; records: Record<string, string>[] }
      | { error: string };
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      parsed = parseXlsxBuffer(await file.arrayBuffer());
    } else {
      parsed = parseCsvText(await file.text());
    }
    if ("error" in parsed) {
      toast.error(parsed.error);
      setPreview(null);
      return;
    }

    const mapping = autoMapHeaders(parsed.headers);
    setPreview({
      file,
      headers: parsed.headers,
      mapping,
      needsMapping: !mappingIsComplete(mapping),
    });
  }, []);

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  function setField(field: RosterField, header: string) {
    setPreview((prev) => {
      if (!prev) return prev;
      const mapping = { ...prev.mapping };
      if (!header) delete mapping[field];
      else mapping[field] = header;
      return {
        ...prev,
        mapping,
        needsMapping: !mappingIsComplete(mapping),
      };
    });
  }

  const mappingReady = useMemo(
    () => (preview ? mappingIsComplete(preview.mapping) : false),
    [preview],
  );

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preview) {
      toast.error("Choose a spreadsheet first");
      return;
    }
    if (!mappingReady) {
      toast.error("Map name and role columns before importing");
      return;
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("csv", preview.file);
    formData.set("columnMapping", JSON.stringify(preview.mapping));
    setRowErrors([]);
    startTransition(async () => {
      const result = await startCsvImportAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        setRowErrors("rowErrors" in result ? result.rowErrors : []);
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
          toast.error(`Import finished with failures. ${summary}`);
        } else if (failed > 0) {
          toast.message(`Import completed with some failures. ${summary}`);
        } else {
          toast.success(`Import completed. ${summary}`);
        }
      }
      setPreview(null);
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
        <Select
          id="import-eventId"
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
        <Label htmlFor="import-templateId">Template</Label>
        <Select id="import-templateId" name="templateId" required>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Approve a template for this event first.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Roster file</Label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-md border border-dashed px-4 py-6 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/20",
          )}
        >
          <p className="text-sm text-foreground">
            Drag & drop a .csv or .xlsx file
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Max 500 rows · 2 MB · first sheet for Excel
          </p>
          <label className="mt-3 inline-flex cursor-pointer">
              <span className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
              Browse files
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {preview && (
            <p className="mt-3 text-xs font-medium text-foreground">
              Selected: {preview.file.name}
            </p>
          )}
        </div>
      </div>

      {preview && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium">
            {preview.needsMapping
              ? "Map columns"
              : "Column mapping (auto-detected)"}
          </p>
          <p className="text-xs text-muted-foreground">
            Headers that do not match name / email / role / achievement need a
            manual map. Name and role are required.
          </p>
          <div className="grid gap-2">
            {ROSTER_FIELDS.map((field) => (
              <label
                key={field.key}
                className="grid grid-cols-[7rem_1fr] items-center gap-2 text-xs"
              >
                <span className="text-muted-foreground">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                <select
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={preview.mapping[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                >
                  <option value="">Skip</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {rowErrors.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-auto rounded-md bg-danger-muted p-3 text-xs text-danger">
          {rowErrors.map((err) => (
            <li key={`${err.rowNumber}-${err.message}`}>
              Row {err.rowNumber}: {err.message}
            </li>
          ))}
        </ul>
      )}
      <Button
        type="submit"
        className="w-full"
        disabled={pending || !preview || !mappingReady}
      >
        {pending && <Spinner />}
        {pending ? "Importing…" : "Validate & import"}
      </Button>
    </form>
  );
}
