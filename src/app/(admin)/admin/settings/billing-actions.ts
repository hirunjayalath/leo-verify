"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PlanTier } from "@/generated/prisma/client";
import { requireClubAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPublicEnv } from "@/lib/env";
import { getStripe, priceIdForTier } from "@/lib/stripe";

export async function startPlanCheckoutAction(formData: FormData) {
  const user = await requireClubAdmin();
  const tierRaw = String(formData.get("tier") || "");
  if (tierRaw !== "club" && tierRaw !== "district") {
    return { ok: false as const, error: "Invalid plan" };
  }
  const tier = tierRaw as PlanTier;

  const stripe = getStripe();
  const priceId = priceIdForTier(tier);
  if (!stripe || !priceId) {
    return {
      ok: false as const,
      error:
        "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_CLUB / STRIPE_PRICE_DISTRICT.",
    };
  }

  const club = await prisma.club.findUniqueOrThrow({
    where: { id: user.clubId! },
  });
  const base = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  let customerId = club.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: club.name,
      metadata: { clubId: club.id },
    });
    customerId = customer.id;
    await prisma.club.update({
      where: { id: club.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/admin/settings?upgraded=1`,
    cancel_url: `${base}/admin/settings?canceled=1`,
    metadata: { clubId: club.id, tier },
  });

  if (!session.url) return { ok: false as const, error: "Checkout failed" };
  redirect(session.url);
}

export async function refreshAfterUpgrade() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}
