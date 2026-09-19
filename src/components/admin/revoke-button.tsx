"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { revokeCertificateAction } from "@/app/(admin)/admin/certificates/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function RevokeButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", certificateId);
    startTransition(async () => {
      const result = await revokeCertificateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Certificate revoked");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Revoke
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input name="reason" placeholder="Reason" required className="h-9" />
      <Button type="submit" size="sm" disabled={pending} variant="danger">
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
