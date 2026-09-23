-- ClubCertSequence + drop stored HMAC + RLS roles/policies

CREATE TABLE "ClubCertSequence" (
    "clubId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClubCertSequence_pkey" PRIMARY KEY ("clubId","year")
);

ALTER TABLE "ClubCertSequence" ADD CONSTRAINT "ClubCertSequence_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Certificate" DROP COLUMN "verificationToken";

-- Readable copies: supabase/rls-policies.sql + supabase/app-role.sql
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
    auth.uid()::text,
    NULLIF(current_setting('app.current_supabase_id', true), '')
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
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.uid()::text,
    NULLIF(current_setting('app.current_supabase_id', true), '')
  );
$$;

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

CREATE POLICY district_select ON "District"
  FOR SELECT
  USING (
    id = public.current_user_district_id()
    OR id IN (SELECT "districtId" FROM "Club" WHERE id = public.current_user_club_id())
  );

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

CREATE POLICY certificate_recipient_select ON "Certificate"
  FOR SELECT
  USING (
    "recipientEmail" IN (
      SELECT email FROM "Recipient"
      WHERE "supabaseId" = public.current_supabase_id()
    )
    OR "recipientId" IN (
      SELECT id FROM "Recipient"
      WHERE "supabaseId" = public.current_supabase_id()
    )
  );

CREATE POLICY certificate_recipient_update ON "Certificate"
  FOR UPDATE
  USING (
    "recipientEmail" IN (
      SELECT email FROM "Recipient"
      WHERE "supabaseId" = public.current_supabase_id()
    )
    OR "recipientId" IN (
      SELECT id FROM "Recipient"
      WHERE "supabaseId" = public.current_supabase_id()
    )
    OR (
      "recipientId" IS NULL
      AND lower("recipientEmail") IN (
        SELECT lower(email) FROM "Recipient"
        WHERE "supabaseId" = public.current_supabase_id()
      )
    )
  )
  WITH CHECK (
    "recipientEmail" IN (
      SELECT email FROM "Recipient"
      WHERE "supabaseId" = public.current_supabase_id()
    )
    OR "recipientId" IN (
      SELECT id FROM "Recipient"
      WHERE "supabaseId" = public.current_supabase_id()
    )
  );

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
    OR public.current_user_role() = 'district_admin'
  );

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
      AND lower(email) = lower(nullif(current_setting('app.current_recipient_email', true), ''))
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leoverify_app') THEN
    CREATE ROLE leoverify_app LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'leoverify_service') THEN
    CREATE ROLE leoverify_service LOGIN NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO leoverify_app;
GRANT USAGE ON SCHEMA public TO leoverify_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO leoverify_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO leoverify_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO leoverify_service;
GRANT INSERT, UPDATE ON "District", "Club", "User", "AuditLog" TO leoverify_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO leoverify_service;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'District', 'Club', 'User', 'Event', 'CertificateTemplate',
    'Certificate', 'Recipient', 'AuditLog', 'ImportJob', 'ImportJobRow',
    'ClubCertSequence'
  ]
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS leoverify_app_dml ON %I', t);
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END;
  END LOOP;
END
$$;

DROP POLICY IF EXISTS service_district_all ON "District";
DROP POLICY IF EXISTS service_club_select ON "Club";
DROP POLICY IF EXISTS service_club_insert ON "Club";
DROP POLICY IF EXISTS service_user_select ON "User";
DROP POLICY IF EXISTS service_user_insert ON "User";
DROP POLICY IF EXISTS service_event_select ON "Event";
DROP POLICY IF EXISTS service_template_select ON "CertificateTemplate";
DROP POLICY IF EXISTS service_certificate_select ON "Certificate";
DROP POLICY IF EXISTS service_recipient_select ON "Recipient";
DROP POLICY IF EXISTS service_audit_insert ON "AuditLog";

CREATE POLICY service_district_all ON "District"
  FOR ALL TO leoverify_service
  USING (true) WITH CHECK (true);

CREATE POLICY service_club_select ON "Club"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_club_insert ON "Club"
  FOR INSERT TO leoverify_service
  WITH CHECK (true);

CREATE POLICY service_user_select ON "User"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_user_insert ON "User"
  FOR INSERT TO leoverify_service
  WITH CHECK (true);

CREATE POLICY service_event_select ON "Event"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_template_select ON "CertificateTemplate"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_certificate_select ON "Certificate"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_recipient_select ON "Recipient"
  FOR SELECT TO leoverify_service
  USING (true);

CREATE POLICY service_audit_insert ON "AuditLog"
  FOR INSERT TO leoverify_service
  WITH CHECK (true);
