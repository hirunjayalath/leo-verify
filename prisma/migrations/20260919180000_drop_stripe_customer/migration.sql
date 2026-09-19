-- Drop Stripe customer id (self-serve billing removed; client-delivered product).
ALTER TABLE "Club" DROP COLUMN IF EXISTS "stripeCustomerId";
