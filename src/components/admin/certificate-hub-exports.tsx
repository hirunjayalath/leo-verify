"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  buildPdfZipManifestAction,
  exportVerifyUrlsCsvAction,
} from "@/app/(admin)/admin/certificates/hub-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CertificateHubExports({ eventId }: { eventId?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await exportVerifyUrlsCsvAction(eventId);
            if (!result.ok) {
              toast.error("Export failed");
              return;
            }
            downloadText(
              "verify-urls.csv",
              result.csv,
              "text/csv;charset=utf-8",
            );
            toast.success(`Exported ${result.count} verify URLs`);
          });
        }}
      >
        {pending && <Spinner />}
        Export verify URLs
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await buildPdfZipManifestAction(eventId);
            if (!result.ok || result.files.length === 0) {
              toast.error("No PDFs available to package");
              return;
            }
            // Client-side sequential open list as a downloadable JSON manifest
            // (full ZIP assembly stays out of the request path for 500+ files).
            downloadText(
              "pdf-download-manifest.json",
              JSON.stringify(result.files, null, 2),
              "application/json",
            );
            toast.success(
              `Prepared ${result.count} PDF links (open within a few minutes)`,
            );
          });
        }}
      >
        PDF download list
      </Button>
    </div>
  );
}
