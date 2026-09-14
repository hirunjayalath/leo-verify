"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { reissueCertificateAction } from "@/app/(admin)/admin/certificates/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ReissueButton({ certificateId }: { certificateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !window.confirm(
        "Reissue this certificate? A new verification token and PDF will be generated. The old QR link will stop working.",
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("id", certificateId);
    startTransition(async () => {
      const result = await reissueCertificateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Certificate reissued");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto px-0 text-xs font-medium text-primary"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Spinner className="h-3 w-3" /> : null}
      {pending ? "Reissuing…" : "Reissue"}
    </Button>
  );
}
