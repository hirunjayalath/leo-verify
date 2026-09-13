DO $$ BEGIN CREATE TYPE "ClubType" AS ENUM ('leo', 'public'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PlanTier" AS ENUM ('free', 'club', 'district'); EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "type" "ClubType" NOT NULL DEFAULT 'leo';
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "plan" "PlanTier" NOT NULL DEFAULT 'free';
ALTER TABLE "Club" ADD COLUMN IF NOT EXISTS "monthlyCertLimit" INTEGER NOT NULL DEFAULT 100;
