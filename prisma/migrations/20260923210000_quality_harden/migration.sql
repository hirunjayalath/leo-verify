-- Certificate / ImportJob club FKs, recipient lookup, tighter RLS.

ALTER TABLE "Certificate"
  ADD CONSTRAINT "Certificate_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImportJob"
  ADD CONSTRAINT "ImportJob_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.recipient_id_for_email(lookup_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Recipient"
  WHERE lower(email) = lower(lookup_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.recipient_id_for_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recipient_id_for_email(text) TO leoverify_app;

DROP POLICY IF EXISTS audit_insert ON "AuditLog";
CREATE POLICY audit_insert ON "AuditLog"
  FOR INSERT
  WITH CHECK (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND (
        "clubId" IS NULL
        OR "clubId" IN (
          SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.protect_certificate_recipient_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.current_user_role() IS NULL THEN
    IF NEW."uniqueId" IS DISTINCT FROM OLD."uniqueId"
      OR NEW."clubId" IS DISTINCT FROM OLD."clubId"
      OR NEW."eventId" IS DISTINCT FROM OLD."eventId"
      OR NEW."recipientName" IS DISTINCT FROM OLD."recipientName"
      OR NEW."recipientEmail" IS DISTINCT FROM OLD."recipientEmail"
      OR NEW."role" IS DISTINCT FROM OLD."role"
      OR NEW."achievement" IS DISTINCT FROM OLD."achievement"
      OR NEW."issueDate" IS DISTINCT FROM OLD."issueDate"
      OR NEW."status" IS DISTINCT FROM OLD."status"
      OR NEW."revokedReason" IS DISTINCT FROM OLD."revokedReason"
      OR NEW."revokedAt" IS DISTINCT FROM OLD."revokedAt"
      OR NEW."revokedById" IS DISTINCT FROM OLD."revokedById"
      OR NEW."pdfUrl" IS DISTINCT FROM OLD."pdfUrl"
      OR NEW."pdfKey" IS DISTINCT FROM OLD."pdfKey"
      OR NEW."tokenVersion" IS DISTINCT FROM OLD."tokenVersion"
    THEN
      RAISE EXCEPTION 'Recipients may only update recipientId and unlisted';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certificate_recipient_column_guard ON "Certificate";
CREATE TRIGGER certificate_recipient_column_guard
  BEFORE UPDATE ON "Certificate"
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_certificate_recipient_columns();

REVOKE SELECT ON "Certificate" FROM leoverify_service;
GRANT SELECT (
  id,
  "uniqueId",
  "clubId",
  "eventId",
  "recipientName",
  role,
  achievement,
  "issueDate",
  status,
  "recipientId",
  unlisted,
  "pdfUrl",
  "pdfKey",
  "tokenVersion",
  "createdAt",
  "updatedAt"
) ON "Certificate" TO leoverify_service;
