"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { approveOwnTemplateAction } from "@/app/(admin)/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ApproveTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const formData = new FormData();
    formData.set("id", templateId);
    startTransition(async () => {
      const result = await approveOwnTemplateAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template approved — ready to issue");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={onClick}
    >
      {pending && <Spinner />}
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}
