import type { PlanTier } from "@/generated/prisma/client";

export type PlanCatalogItem = {
  tier: PlanTier;
  name: string;
  blurb: string;
  priceLabel: string;
  period?: string;
  monthlyCertLimit: number;
  /** Stripe Price ID env key — resolved at checkout time */
  stripePriceEnv: string | null;
  features: string[];
  ctaHref: string;
  ctaLabel: string;
  highlighted?: boolean;
};

export const PLAN_CATALOG: PlanCatalogItem[] = [
  {
    tier: "free",
    name: "Free",
    blurb: "For pilots and small events",
    priceLabel: "$0",
    monthlyCertLimit: 50,
    stripePriceEnv: null,
    features: [
      "50 certificates / month",
      "Drag-and-drop designer",
      "CSV / Excel import",
      "Public org portal",
      "Live HMAC verification",
    ],
    ctaHref: "/signup",
    ctaLabel: "Sign up free",
  },
  {
    tier: "club",
    name: "Club",
    blurb: "For growing programs",
    priceLabel: "$29",
    period: "month",
    monthlyCertLimit: 500,
    stripePriceEnv: "STRIPE_PRICE_CLUB",
    highlighted: true,
    features: [
      "500 certificates / month",
      "Branded emails & OG cards",
      "Bulk ZIP / URL export",
      "Priority email delivery",
      "Everything in Free",
    ],
    ctaHref: "/signup",
    ctaLabel: "Start free, upgrade later",
  },
  {
    tier: "district",
    name: "District",
    blurb: "Multi-club operators",
    priceLabel: "$99",
    period: "month",
    monthlyCertLimit: 5000,
    stripePriceEnv: "STRIPE_PRICE_DISTRICT",
    features: [
      "5,000 certificates / month",
      "District analytics",
      "Multi-club oversight",
      "Custom onboarding help",
      "Everything in Club",
    ],
    ctaHref: "/signup",
    ctaLabel: "Talk to us via signup",
  },
];

export function limitsForTier(tier: PlanTier): number {
  return PLAN_CATALOG.find((p) => p.tier === tier)?.monthlyCertLimit ?? 50;
}
