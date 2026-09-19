import Stripe from "stripe";
import { limitsForTier, PLAN_CATALOG } from "@/lib/plans";
import type { PlanTier } from "@/generated/prisma/client";

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function priceIdForTier(tier: PlanTier): string | null {
  const item = PLAN_CATALOG.find((p) => p.tier === tier);
  if (!item?.stripePriceEnv) return null;
  return process.env[item.stripePriceEnv] || null;
}

export { limitsForTier };
