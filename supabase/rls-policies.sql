-- LeoVerify Row-Level Security policies (Rule 3)
-- Applied by Prisma migration (not only a SQL-editor step).
-- App-level clubId checks stay required. These policies are the backstop for
-- leoverify_app. Public verify / portals / signup use leoverify_service.

-- Map auth.users → public."User" via supabaseId, or Prisma GUC
-- app.current_supabase_id (set LOCAL inside withRlsContext).
-- Club admins may only touch rows whose club_id matches their User.clubId.
-- District admins may touch rows for clubs in their district.

ALTER TABLE "Club" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CertificateTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Certificate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "District" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportJobRow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubCertSequence" ENABLE ROW LEVEL SECURITY;

-- Helper: current app user row
CREATE OR REPLACE FUNCTION public.current_app_user()
RETURNS "User"
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM "User"
  WHERE "supabaseId" = COALESCE(
    NULLIF(current_setting('app.current_supabase_id', true), ''),
    auth.uid()::text
  )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_club_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "clubId" FROM public.current_app_user();
$$;

CREATE OR REPLACE FUNCTION public.current_user_district_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "districtId" FROM public.current_app_user();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "role"::text FROM public.current_app_user();
$$;

CREATE OR REPLACE FUNCTION public.current_supabase_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_supabase_id', true), ''),
    auth.uid()::text
  );
$$;

CREATE OR REPLACE FUNCTION public.current_recipient_ids()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "Recipient"
  WHERE "supabaseId" = public.current_supabase_id();
$$;

CREATE OR REPLACE FUNCTION public.current_recipient_emails()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM "Recipient"
  WHERE "supabaseId" = public.current_supabase_id();
$$;

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

-- Drop policies we (re)create so migrate is idempotent
DROP POLICY IF EXISTS district_select ON "District";
DROP POLICY IF EXISTS club_select ON "Club";
DROP POLICY IF EXISTS club_modify ON "Club";
DROP POLICY IF EXISTS event_club_access ON "Event";
DROP POLICY IF EXISTS template_club_access ON "CertificateTemplate";
DROP POLICY IF EXISTS certificate_club_access ON "Certificate";
DROP POLICY IF EXISTS certificate_recipient_select ON "Certificate";
DROP POLICY IF EXISTS certificate_recipient_update ON "Certificate";
DROP POLICY IF EXISTS audit_select ON "AuditLog";
DROP POLICY IF EXISTS audit_insert ON "AuditLog";
DROP POLICY IF EXISTS user_self_select ON "User";
DROP POLICY IF EXISTS user_district_write ON "User";
DROP POLICY IF EXISTS recipient_club_select ON "Recipient";
DROP POLICY IF EXISTS recipient_self_select ON "Recipient";
DROP POLICY IF EXISTS recipient_self_insert ON "Recipient";
DROP POLICY IF EXISTS recipient_self_update ON "Recipient";
DROP POLICY IF EXISTS import_job_club_access ON "ImportJob";
DROP POLICY IF EXISTS import_job_row_club_access ON "ImportJobRow";
DROP POLICY IF EXISTS sequence_club_access ON "ClubCertSequence";

-- District: district admins see their district; club admins see their club's district
CREATE POLICY district_select ON "District"
  FOR SELECT
  USING (
    id = public.current_user_district_id()
    OR id IN (SELECT "districtId" FROM "Club" WHERE id = public.current_user_club_id())
  );

-- Club
CREATE POLICY club_select ON "Club"
  FOR SELECT
  USING (
    id = public.current_user_club_id()
    OR ("districtId" = public.current_user_district_id() AND public.current_user_role() = 'district_admin')
  );

CREATE POLICY club_modify ON "Club"
  FOR ALL
  USING (
    public.current_user_role() = 'district_admin'
    AND "districtId" = public.current_user_district_id()
  )
  WITH CHECK (
    public.current_user_role() = 'district_admin'
    AND "districtId" = public.current_user_district_id()
  );

-- Event
CREATE POLICY event_club_access ON "Event"
  FOR ALL
  USING (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  )
  WITH CHECK (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  );

-- CertificateTemplate
CREATE POLICY template_club_access ON "CertificateTemplate"
  FOR ALL
  USING (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  )
  WITH CHECK (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  );

-- Certificate (admin/dashboard)
CREATE POLICY certificate_club_access ON "Certificate"
  FOR ALL
  USING (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  )
  WITH CHECK (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  );

-- Recipient can see certificates issued to their email / bound supabaseId
CREATE POLICY certificate_recipient_select ON "Certificate"
  FOR SELECT
  USING (
    "recipientEmail" IN (SELECT public.current_recipient_emails())
    OR "recipientId" IN (SELECT public.current_recipient_ids())
  );

CREATE POLICY certificate_recipient_update ON "Certificate"
  FOR UPDATE
  USING (
    "recipientEmail" IN (SELECT public.current_recipient_emails())
    OR "recipientId" IN (SELECT public.current_recipient_ids())
    OR (
      "recipientId" IS NULL
      AND lower("recipientEmail") IN (
        SELECT lower(e) FROM public.current_recipient_emails() AS e
      )
    )
  )
  WITH CHECK (
    "recipientEmail" IN (SELECT public.current_recipient_emails())
    OR "recipientId" IN (SELECT public.current_recipient_ids())
  );

-- AuditLog
CREATE POLICY audit_select ON "AuditLog"
  FOR SELECT
  USING (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  );

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

-- User: self via Auth UUID or Prisma GUC; club/district peers
CREATE POLICY user_self_select ON "User"
  FOR SELECT
  USING (
    "supabaseId" = public.current_supabase_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND (
        "districtId" = public.current_user_district_id()
        OR "clubId" IN (
          SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
        )
      )
    )
    OR (
      public.current_user_role() = 'club_admin'
      AND "clubId" = public.current_user_club_id()
    )
  );

CREATE POLICY user_district_write ON "User"
  FOR ALL
  USING (
    public.current_user_role() = 'district_admin'
    AND (
      "districtId" = public.current_user_district_id()
      OR "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  )
  WITH CHECK (
    public.current_user_role() = 'district_admin'
    AND "districtId" = public.current_user_district_id()
  );

-- Recipient: club admins see recipients linked to their club's certificates
CREATE POLICY recipient_club_select ON "Recipient"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Certificate" c
      WHERE c."recipientId" = "Recipient".id
        AND (
          c."clubId" = public.current_user_club_id()
          OR (
            public.current_user_role() = 'district_admin'
            AND c."clubId" IN (
              SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
            )
          )
        )
    )
  );

CREATE POLICY recipient_self_select ON "Recipient"
  FOR SELECT
  USING (
    "supabaseId" = public.current_supabase_id()
    OR (
      "supabaseId" IS NULL
      AND lower(email) = lower(
        COALESCE(
          (SELECT email FROM "User" WHERE "supabaseId" = public.current_supabase_id()),
          current_setting('app.current_recipient_email', true)
        )
      )
    )
  );

CREATE POLICY recipient_self_insert ON "Recipient"
  FOR INSERT
  WITH CHECK (
    "supabaseId" = public.current_supabase_id()
  );

CREATE POLICY recipient_self_update ON "Recipient"
  FOR UPDATE
  USING (
    "supabaseId" = public.current_supabase_id()
    OR (
      "supabaseId" IS NULL
      AND lower(email) = lower(nullif(current_setting('app.current_recipient_email', true), ''))
    )
  )
  WITH CHECK (
    "supabaseId" = public.current_supabase_id()
  );

-- ImportJob
CREATE POLICY import_job_club_access ON "ImportJob"
  FOR ALL
  USING (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  )
  WITH CHECK (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  );

CREATE POLICY import_job_row_club_access ON "ImportJobRow"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "ImportJob" j
      WHERE j.id = "ImportJobRow"."jobId"
        AND (
          j."clubId" = public.current_user_club_id()
          OR (
            public.current_user_role() = 'district_admin'
            AND j."clubId" IN (
              SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "ImportJob" j
      WHERE j.id = "ImportJobRow"."jobId"
        AND (
          j."clubId" = public.current_user_club_id()
          OR (
            public.current_user_role() = 'district_admin'
            AND j."clubId" IN (
              SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
            )
          )
        )
    )
  );

CREATE POLICY sequence_club_access ON "ClubCertSequence"
  FOR ALL
  USING (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
      )
    )
  )
  WITH CHECK (
    "clubId" = public.current_user_club_id()
    OR (
      public.current_user_role() = 'district_admin'
      AND "clubId" IN (
        SELECT id FROM "Club" WHERE "districtId" = public.current_user_district_id()
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

REVOKE ALL ON FUNCTION public.recipient_id_for_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recipient_id_for_email(text) TO leoverify_app;

CREATE OR REPLACE FUNCTION public.import_job_actor_supabase_id(job_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u."supabaseId"
  FROM "ImportJob" j
  JOIN "User" u ON u.id = j."createdById"
  WHERE j.id = job_id
$$;

REVOKE ALL ON FUNCTION public.import_job_actor_supabase_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_job_actor_supabase_id(text) TO leoverify_service;
GRANT EXECUTE ON FUNCTION public.import_job_actor_supabase_id(text) TO leoverify_app;

-- NOTE: Public verification MUST NOT use the anon key against these tables.
-- Use prismaService (leoverify_service). See supabase/app-role.sql.
