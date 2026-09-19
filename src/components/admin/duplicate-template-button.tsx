"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { duplicateTemplateAction } from "@/app/(admin)/admin/templates/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function DuplicateTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        const fd = new FormData();
        fd.set("id", templateId);
        startTransition(async () => {
          const result = await duplicateTemplateAction(fd);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Template duplicated");
          if (result.id) router.push(`/admin/templates/${result.id}/edit`);
          else router.refresh();
        });
      }}
    >
      {pending && <Spinner />}
      Duplicate
    </Button>
  );
}
