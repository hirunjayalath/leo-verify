"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { revertTemplateToDraftAction } from "@/app/(admin)/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function RevertTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const formData = new FormData();
    formData.set("id", templateId);
    startTransition(async () => {
      const result = await revertTemplateToDraftAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template reverted to draft. Edit and resubmit.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={onClick}
    >
      {pending && <Spinner />}
      Revert to draft
    </Button>
  );
}
