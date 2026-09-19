"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { startPlanCheckoutAction } from "@/app/(admin)/admin/settings/billing-actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PLAN_CATALOG } from "@/lib/plans";
import type { PlanTier } from "@/generated/prisma/client";

export function PlanUpgradeCards({ currentPlan }: { currentPlan: PlanTier }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {PLAN_CATALOG.filter((p) => p.tier === "club" || p.tier === "district").map(
        (plan) => (
          <div
            key={plan.tier}
            className="rounded-xl border border-border p-4"
          >
            <p className="font-medium">{plan.name}</p>
            <p className="text-xs text-muted-foreground">{plan.blurb}</p>
            <p className="mt-2 text-lg font-semibold">
              {plan.priceLabel}
              {plan.period ? (
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.period}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.monthlyCertLimit} certs / month
            </p>
            {currentPlan === plan.tier ? (
              <p className="mt-3 text-xs font-medium text-success">Current plan</p>
            ) : (
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={pending}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("tier", plan.tier);
                  startTransition(async () => {
                    const result = await startPlanCheckoutAction(fd);
                    if (result && !result.ok) toast.error(result.error);
                  });
                }}
              >
                {pending && <Spinner />}
                Upgrade to {plan.name}
              </Button>
            )}
          </div>
        ),
      )}
    </div>
  );
}
