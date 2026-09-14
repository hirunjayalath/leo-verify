-- Token version for HMAC rotation on reissue
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 1;

-- Replace blanket unique with issued-only partial uniques so revoke → re-issue works
DROP INDEX IF EXISTS "Certificate_eventId_recipientEmail_recipientName_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_issued_email_name_key"
  ON "Certificate" ("eventId", "recipientEmail", "recipientName")
  WHERE "status" = 'issued' AND "recipientEmail" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_issued_name_noemail_key"
  ON "Certificate" ("eventId", "recipientName")
  WHERE "status" = 'issued' AND "recipientEmail" IS NULL;
