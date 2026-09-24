-- UOM can disable district admins
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP(3);

-- Service letters share the designer pipeline
DO $$ BEGIN
  CREATE TYPE "TemplateKind" AS ENUM ('certificate', 'service_letter');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "CertificateTemplate" ADD COLUMN IF NOT EXISTS "kind" "TemplateKind" NOT NULL DEFAULT 'certificate';

-- Issue is per template (event parts)
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "templateId" TEXT;

UPDATE "Certificate" AS c
SET "templateId" = (
  SELECT t.id
  FROM "CertificateTemplate" AS t
  WHERE t."eventId" = c."eventId"
    AND t."clubId" = c."clubId"
    AND t.status = 'approved'
  ORDER BY t."updatedAt" DESC
  LIMIT 1
)
WHERE c."templateId" IS NULL;

UPDATE "Certificate" AS c
SET "templateId" = (
  SELECT t.id
  FROM "CertificateTemplate" AS t
  WHERE t."eventId" = c."eventId"
    AND t."clubId" = c."clubId"
  ORDER BY t."updatedAt" DESC
  LIMIT 1
)
WHERE c."templateId" IS NULL;

ALTER TABLE "ImportJob" ADD COLUMN IF NOT EXISTS "templateId" TEXT;

UPDATE "ImportJob" AS j
SET "templateId" = (
  SELECT t.id
  FROM "CertificateTemplate" AS t
  WHERE t."eventId" = j."eventId"
    AND t."clubId" = j."clubId"
    AND t.status = 'approved'
  ORDER BY t."updatedAt" DESC
  LIMIT 1
)
WHERE j."templateId" IS NULL;

UPDATE "ImportJob" AS j
SET "templateId" = (
  SELECT t.id
  FROM "CertificateTemplate" AS t
  WHERE t."eventId" = j."eventId"
    AND t."clubId" = j."clubId"
  ORDER BY t."updatedAt" DESC
  LIMIT 1
)
WHERE j."templateId" IS NULL;

DO $$ BEGIN
  ALTER TABLE "Certificate"
    ADD CONSTRAINT "Certificate_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ImportJob"
    ADD CONSTRAINT "ImportJob_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Certificate_templateId_idx" ON "Certificate"("templateId");
CREATE INDEX IF NOT EXISTS "ImportJob_templateId_idx" ON "ImportJob"("templateId");

DROP INDEX IF EXISTS "Certificate_issued_email_name_key";
DROP INDEX IF EXISTS "Certificate_issued_name_noemail_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_issued_email_name_template_key"
  ON "Certificate" ("eventId", "templateId", "recipientEmail", "recipientName")
  WHERE "status" = 'issued' AND "recipientEmail" IS NOT NULL AND "templateId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_issued_name_noemail_template_key"
  ON "Certificate" ("eventId", "templateId", "recipientName")
  WHERE "status" = 'issued' AND "recipientEmail" IS NULL AND "templateId" IS NOT NULL;

-- Service-role writes for UOM operator (district create / district-admin invite)
DROP POLICY IF EXISTS service_district_write ON "District";
CREATE POLICY service_district_write ON "District"
  FOR ALL TO leoverify_service
  USING (true)
  WITH CHECK (true);
GRANT INSERT, UPDATE ON "District" TO leoverify_service;

DROP POLICY IF EXISTS service_user_write ON "User";
CREATE POLICY service_user_write ON "User"
  FOR ALL TO leoverify_service
  USING (true)
  WITH CHECK (true);
GRANT INSERT, UPDATE ON "User" TO leoverify_service;
