"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { reissueCertificateAction } from "@/app/(admin)/admin/certificates/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ReissueButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("id", certificateId);
    startTransition(async () => {
      const result = await reissueCertificateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Certificate reissued. Old QR links no longer check as valid.");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto px-0 text-xs font-medium text-primary"
        onClick={() => setOpen(true)}
      >
        Reissue
      </Button>
    );
  }

  return (
    <form
      onSubmit={onConfirm}
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-2 sm:flex-row sm:items-center"
    >
      <p className="text-xs text-muted-foreground">
        New token + PDF. Old QR links will stop working.
      </p>
      <Button type="submit" size="sm" disabled={pending}>
        {pending && <Spinner />}
        Confirm
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
    </form>
  );
}
