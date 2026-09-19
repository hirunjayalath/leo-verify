import Link from "next/link";
import { Check } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLAN_CATALOG } from "@/lib/plans";

export const metadata = {
  title: "Pricing",
  description: "LeoVerify plans for clubs and organizations issuing digital credentials.",
};

export default function PricingPage() {
  return (
    <div className="surface-grid">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Pricing
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Simple plans for credential programs
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Start free. Upgrade when your monthly issuance grows. All plans include
          live verification, HMAC QR tokens, and revoke/reissue.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLAN_CATALOG.map((plan) => (
            <Card
              key={plan.tier}
              className={
                plan.highlighted
                  ? "border-accent shadow-float ring-1 ring-accent/30"
                  : undefined
              }
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.blurb}</CardDescription>
                <p className="pt-4">
                  <span className="text-3xl font-semibold tabular-nums">
                    {plan.priceLabel}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / {plan.period}
                    </span>
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link
                    href={plan.ctaHref}
                    className={
                      plan.highlighted
                        ? "inline-flex h-10 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        : "inline-flex h-10 w-full items-center justify-center rounded-full border border-border bg-card text-sm font-medium hover:bg-muted"
                    }
                  >
                    {plan.ctaLabel}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Need district multi-club ops?{" "}
          <Link href="/signup" className="font-medium underline-offset-4 hover:underline">
            Start on Club
          </Link>{" "}
          and upgrade, or contact support for District.
        </p>
      </div>
    </div>
  );
}
