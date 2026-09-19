import { NextResponse } from "next/server";
import { PlanTier } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { limitsForTier } from "@/lib/plans";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { clubId?: string; tier?: string };
      customer?: string | null;
    };
    const clubId = session.metadata?.clubId;
    const tierRaw = session.metadata?.tier;
    if (
      clubId &&
      (tierRaw === "club" || tierRaw === "district" || tierRaw === "free")
    ) {
      const tier = tierRaw as PlanTier;
      await prisma.club.update({
        where: { id: clubId },
        data: {
          plan: tier,
          monthlyCertLimit: limitsForTier(tier),
          ...(typeof session.customer === "string"
            ? { stripeCustomerId: session.customer }
            : {}),
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
