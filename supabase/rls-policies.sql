-- LeoVerify Row-Level Security policies (Rule 3)
-- Apply in the Supabase SQL editor after Prisma migrations create the tables.
-- App-level checks are necessary but not sufficient — these policies are the backstop.

-- Map auth.users → public."User" via supabaseId.
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
  WHERE "supabaseId" = auth.uid()::text
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

-- Certificate (admin/dashboard access — public verification uses the service role / server path)
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

-- AuditLog: readable by matching club / district; inserts via service role preferred
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

-- User: users can read themselves; district admins read users in their district
CREATE POLICY user_self_select ON "User"
  FOR SELECT
  USING (
    "supabaseId" = auth.uid()::text
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

-- NOTE: Public verification MUST NOT use the anon key against these tables.
-- Use a server-side Prisma/service-role path that looks up by uniqueId + verifies HMAC,
-- and returns only the minimal public fields (Rule 8).
