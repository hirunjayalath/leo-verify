ALTER TABLE "Recipient" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Recipient" ADD COLUMN IF NOT EXISTS "supabaseId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Recipient_slug_key" ON "Recipient"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Recipient_supabaseId_key" ON "Recipient"("supabaseId");
